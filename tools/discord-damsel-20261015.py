"""Discord Damsel: local BetterDiscord inventory and installer recovery."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
import urllib.request
import winreg
import zipfile
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = Path(__file__).resolve().parent
DATA = BASE / 'damsel-data'
BD = Path(os.environ['APPDATA']) / 'BetterDiscord'
LOCAL = Path(os.environ['LOCALAPPDATA'])
STATE = DATA / 'recovery-state-20261015.json'
RUN = r'Software\Microsoft\Windows\CurrentVersion\Run'
API = 'https://api.github.com/repos/BetterDiscord/Installer/releases/latest'

def stamp():
    try:
        return datetime.now(ZoneInfo('America/Denver')).strftime('%Y%m%d-%H%M%S')
    except KeyError:
        # Windows supplies timezone rules even when Python has no IANA database.
        return subprocess.check_output(['powershell.exe', '-NoProfile', '-Command',
            "[TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'Mountain Standard Time').ToString('yyyyMMdd-HHmmss')"],
            creationflags=subprocess.CREATE_NO_WINDOW, text=True).strip()

def read_state():
    try:
        value = json.loads(STATE.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}

def save_state(value):
    DATA.mkdir(exist_ok=True)
    temp = DATA / 'recovery-state-pending-20261015.json'
    temp.write_text(json.dumps(value, indent=2))
    temp.replace(STATE)

def health(local=LOCAL, bd=BD):
    channels = []
    for name in ('Discord', 'DiscordPTB', 'DiscordCanary'):
        apps = list((local / name).glob('app-*'))
        def version(p):
            return tuple(int(n) for n in re.findall(r'\d+', p.name))
        if not apps:
            continue
        app = max(apps, key=version)
        loaders = list(app.glob('modules/discord_desktop_core-*/discord_desktop_core/index.js'))
        patched = any('betterdiscord' in p.read_text(errors='replace').lower() for p in loaders)
        archive = bd / 'data' / 'betterdiscord.asar'
        present = archive.is_file() and archive.stat().st_size > 0
        channels.append({'channel': name, 'version': app.name, 'loader': patched,
                         'archive': present, 'needs_repair': not (patched and present)})
    return channels

def inventory(bd=BD):
    result = []
    for kind, suffix in (('plugins', '.plugin.js'), ('themes', '.theme.css')):
        for p in sorted((bd / kind).glob('*' + suffix)):
            result.append((kind, p))
    return result

def download():
    request = urllib.request.Request(API, headers={'User-Agent': 'Discord-Damsel/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        release = json.load(response)
    asset = next(a for a in release['assets'] if a['name'] == 'BetterDiscord-Installer-Windows.exe')
    url = asset['browser_download_url']
    if not url.startswith('https://github.com/BetterDiscord/Installer/releases/download/'):
        raise ValueError('Unexpected release URL')
    digest = asset.get('digest', '')
    if not re.fullmatch(r'sha256:[a-f0-9]{64}', digest):
        raise ValueError('Official SHA-256 missing; download not accepted')
    with urllib.request.urlopen(url, timeout=60) as response:
        payload = response.read(100_000_001)
    if len(payload) != asset['size'] or not payload.startswith(b'MZ'):
        raise ValueError('Installer size or executable header is invalid')
    if hashlib.sha256(payload).hexdigest() != digest[7:]:
        raise ValueError('Installer checksum mismatch')
    target = BASE / ('betterdiscord-installer-' + stamp() + '.exe')
    target.write_bytes(payload)
    return target, release['tag_name'], digest[7:]

def installer_path(state):
    value = state.get('installer') or str(BASE / 'betterdiscord-installer-20261015.exe')
    if not isinstance(value, str):
        raise ValueError('Invalid installer path')
    path = Path(value).resolve()
    if path.parent != BASE.resolve() or not re.fullmatch(r'betterdiscord-installer-\d{8}(?:-\d{6})?\.exe', path.name):
        raise ValueError('Installer must be in the recovery folder')
    return path

def installer_valid(state):
    try:
        p = installer_path(state)
        expected = state.get('sha256', '2eda2104c900a77fbb0568ade67becda3c087ffcbb7a267f3f8e512c18270432')
        return isinstance(expected, str) and bool(re.fullmatch(r'[a-f0-9]{64}', expected)) and p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest() == expected
    except (OSError, TypeError, ValueError):
        return False

def check(force=False):
    DATA.mkdir(exist_ok=True)
    # Cross-process lock prevents UI/manual recovery racing the watcher.
    import msvcrt
    with (DATA / 'recovery-lock-20261015.lock').open('a+b') as lock:
        lock.seek(0)
        if lock.read(1) == b'':
            lock.write(b'0'); lock.flush()
        lock.seek(0)
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            return read_state()
        try:
            state = read_state()
            rows = health()
            signature = json.dumps(rows, sort_keys=True)
            broken = any(r['needs_repair'] for r in rows)
            needed = force or not installer_valid(state) or (broken and state.get('recovered_signature') != signature)
            now = time.time()
            state.update(channels=rows, checked=now)
            if needed and (force or now - (state.get('attempted', 0) if isinstance(state.get('attempted', 0), (int, float)) else 0) >= 1800):
                state['attempted'] = now
                try:
                    p, version, digest = download()
                    state.update(installer=str(p), version=version, sha256=digest,
                                 recovered_signature=signature, error='', downloaded=now)
                except Exception as exc:
                    state['error'] = str(exc)
            state['message'] = ('Repair needed: open the installer and choose Install or Repair.' if broken else
                                'Loader files present; runtime behavior has not been verified.' if rows else
                                'No supported Discord installation found.')
            save_state(state)
            return state
        finally:
            lock.seek(0); msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)

def park(path, kind, data=DATA):
    if kind not in ('plugins', 'themes') or path.suffix not in ('.js', '.css'):
        raise ValueError('Unsupported extension')
    folder = data / 'parked'
    folder.mkdir(parents=True, exist_ok=True)
    slug = re.sub('[^a-z0-9-]', '-', path.name.lower()).strip('-')
    archive = folder / (slug + '-' + stamp() + '.zip')
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED) as z:
        z.writestr(kind + '/' + path.name, path.read_bytes())
    with zipfile.ZipFile(archive) as z:
        if z.read(kind + '/' + path.name) != path.read_bytes():
            raise ValueError('Backup verification failed')
    path.unlink()
    return archive

def restore(archive, bd=BD):
    with zipfile.ZipFile(archive) as z:
        entries = z.namelist()
        if len(entries) != 1:
            raise ValueError('Expected one extension')
        parts = entries[0].split('/')
        if len(parts) != 2 or parts[0] not in ('plugins', 'themes') or Path(parts[1]).name != parts[1] or ':' in parts[1]:
            raise ValueError('Unsafe archive path')
        suffix = '.plugin.js' if parts[0] == 'plugins' else '.theme.css'
        if not parts[1].endswith(suffix):
            raise ValueError('Unsupported extension')
        destination = bd / parts[0] / parts[1]
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('xb') as output:
            output.write(z.read(entries[0]))
    return destination

def startup(enabled):
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, RUN) as key:
        if enabled:
            pythonw = Path(sys.executable).with_name('pythonw.exe')
            command = subprocess.list2cmdline([str(pythonw), str(Path(__file__).resolve()), '--watch'])
            winreg.SetValueEx(key, 'DiscordDamsel', 0, winreg.REG_SZ, command)
        else:
            try: winreg.DeleteValue(key, 'DiscordDamsel')
            except FileNotFoundError: pass

def startup_enabled():
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN) as key:
            winreg.QueryValueEx(key, 'DiscordDamsel')
        return True
    except FileNotFoundError:
        return False

def start_watcher():
    subprocess.Popen([str(Path(sys.executable).with_name('pythonw.exe')), str(Path(__file__).resolve()), '--watch'],
                     creationflags=subprocess.CREATE_NO_WINDOW)

def watch():
    kernel = ctypes.windll.kernel32
    kernel.CreateMutexW.restype = ctypes.c_void_p
    handle = kernel.CreateMutexW(None, False, 'Local\\DiscordDamselWatcher')
    if kernel.GetLastError() == 183:
        kernel.CloseHandle(handle); return
    try:
        while startup_enabled():
            try: check()
            except Exception: pass  # Retry next interval after transient filesystem problems.
            time.sleep(60)
    finally:
        kernel.CloseHandle(ctypes.c_void_p(handle))

def gui():
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    root = tk.Tk(); root.title('BetterDiscord Recovery — Discord Tower'); root.geometry('940x660'); root.minsize(820, 600)
    root.configure(bg='#e4f3fb')
    style = ttk.Style(); style.theme_use('clam')
    style.configure('TFrame', background='#e4f3fb')
    style.configure('TLabel', background='#e4f3fb', foreground='#382a3d', font=('Segoe UI', 11))
    style.configure('TButton', padding=9, font=('Segoe UI', 10), background='#e6b0d0')
    style.configure('Treeview', rowheight=29, font=('Segoe UI', 10))
    frame = ttk.Frame(root, padding=24); frame.pack(fill='both', expand=True)
    ttk.Label(frame, text='BetterDiscord Recovery', font=('Segoe UI', 27, 'bold'), foreground='#86436f').pack(anchor='w')
    ttk.Label(frame, text='Discord Tower · Discord Damsel’s local plugins, themes, and recovery tool.').pack(anchor='w', pady=(0,16))
    status = tk.StringVar(value='Checking local installation…')
    ttk.Label(frame, textvariable=status, wraplength=860).pack(anchor='w', pady=8)
    tools = ttk.Frame(frame); tools.pack(fill='x', pady=8)
    def background(force=False):
        status.set('Checking and preparing recovery…')
        def worker():
            try: check(force)
            except Exception as exc: root.after(0, lambda e=str(exc): status.set(e))
            root.after(0, refresh)
        threading.Thread(target=worker, daemon=True).start()
    def open_installer():
        state = read_state()
        if not installer_valid(state):
            messagebox.showinfo('Download needed', 'Click Something’s broken to download a verified installer first.'); return
        os.startfile(installer_path(state))
    ttk.Button(tools, text='Check now', command=background).pack(side='left', padx=(0,8))
    ttk.Button(tools, text='Something’s broken', command=lambda: background(True)).pack(side='left', padx=8)
    ttk.Button(tools, text='Open official installer', command=open_installer).pack(side='left', padx=8)
    monitor = tk.StringVar()
    def toggle():
        enabled = not startup_enabled(); startup(enabled)
        if enabled: start_watcher()
        refresh()
    ttk.Button(frame, textvariable=monitor, command=toggle).pack(anchor='w', pady=8)
    ttk.Label(frame, text='YOUR EXTENSIONS', font=('Segoe UI', 10, 'bold')).pack(anchor='w', pady=(16,6))
    tree = ttk.Treeview(frame, columns=('type','name','state'), show='headings', selectmode='browse', height=5)
    for key, width in [('type',90),('name',480),('state',180)]:
        tree.heading(key,text=key.title()); tree.column(key,width=width)
    tree.pack(fill='both', expand=True)
    items = {}
    def refresh():
        state = read_state(); rows = health()
        details = ' | '.join(r['channel'] + ': ' + ('repair needed' if r['needs_repair'] else 'loader present') for r in rows)
        status.set((details or 'Discord not found') + '\n' + state.get('message','') +
                   ('\nDownload error: ' + state['error'] if state.get('error') else '') +
                   '\nInstaller: ' + ('verified and ready' if installer_valid(state) else 'missing or changed'))
        monitor.set('Monitoring ON · runs at sign-in · click to stop' if startup_enabled() else 'Monitoring OFF · click to enable')
        tree.delete(*tree.get_children()); items.clear()
        for kind, p in inventory():
            iid=tree.insert('', 'end', values=(kind,p.name,'Installed file')); items[iid]=(kind,p,False)
        for p in sorted((DATA/'parked').glob('*.zip')):
            iid=tree.insert('', 'end', values=('backup',p.name,'Parked / restorable')); items[iid]=('',p,True)
    def selected_action():
        selection=tree.selection()
        if not selection: return
        kind,p,parked=items[selection[0]]
        try:
            if parked: restore(p)
            elif messagebox.askyesno('Park extension?', 'Save a verified backup and remove this extension from the active folder? Restart Discord afterward.'):
                park(p,kind)
            refresh()
        except Exception as exc: messagebox.showerror('Extension unchanged or backup retained',str(exc))
    def import_extension():
        names=filedialog.askopenfilenames(title='Select existing BetterDiscord plugins or themes', filetypes=[('BetterDiscord extensions','*.js *.css')])
        for name in names:
            p=Path(name); kind='plugins' if p.name.endswith('.plugin.js') else 'themes' if p.name.endswith('.theme.css') else None
            if not kind: messagebox.showerror('Unsupported file',p.name); continue
            try:
                dest=BD/kind/p.name; dest.parent.mkdir(parents=True,exist_ok=True)
                with dest.open('xb') as output: output.write(p.read_bytes())
            except Exception as exc: messagebox.showerror('Import skipped',str(exc))
        refresh()
    bottom=ttk.Frame(frame); bottom.pack(fill='x',pady=12)
    ttk.Button(bottom,text='Park / restore selected',command=selected_action).pack(side='left',padx=(0,8))
    ttk.Button(bottom,text='Import plugins / themes…',command=import_extension).pack(side='left',padx=8)
    ttk.Button(bottom,text='Open downloads',command=lambda: os.startfile(BASE)).pack(side='left',padx=8)
    ttk.Label(frame,text='Checks every minute. Recovery downloads are automatic; run Install / Repair in the installer.\nInstalled files may be disabled inside Discord. Restart Discord after moving extensions.',font=('Segoe UI',9)).pack(anchor='w')
    def poll():
        refresh(); root.after(15000,poll)
    poll(); background(); root.mainloop()

if __name__ == '__main__':
    if '--watch' in sys.argv: watch()
    elif '--enable-watch' in sys.argv: startup(True); start_watcher()
    elif '--check' in sys.argv: print(json.dumps(check(),indent=2))
    else: gui()
