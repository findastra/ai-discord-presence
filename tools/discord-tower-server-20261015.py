"""Local Discord Tower UI and bounded recovery actions. OpenAI Codex GPT-6, 2026-10-15."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import importlib.util
import json
import os
import subprocess
import sys
sys.dont_write_bytecode = True
import threading
from urllib.parse import urlsplit

BASE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('damsel',BASE/'discord-damsel-20261015.py')
damsel=importlib.util.module_from_spec(spec)
spec.loader.exec_module(damsel)
SITE=BASE.parent if (BASE.parent/'findastra-discord-presence-20261008.html').is_file() else Path.home()/'Documents'/"Astra's Pet Apps"/'findastra-discord-presence'
ORIGIN='http://127.0.0.1:38764'
busy=threading.Lock()

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(SITE),**kwargs)
    def json(self,value,status=200):
        payload=json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers()
        self.wfile.write(payload)
    def valid_host(self):
        return self.headers.get('Host')=='127.0.0.1:38764'
    def do_GET(self):
        if not self.valid_host():return self.json({'error':'Invalid host'},403)
        if urlsplit(self.path).path=='/api/status':
            state=damsel.read_state()
            return self.json({'channels':damsel.health(),'monitor':damsel.startup_enabled(),
                'checked':state.get('checked'),'message':state.get('message'),'error':state.get('error',''),
                'installer_ready':damsel.installer_valid(state),'busy':busy.locked(),
                'programs':{'openai':'http://127.0.0.1:38761/','anthropic':'http://127.0.0.1:38762/'},
                'extensions':[{'kind':k,'name':p.name} for k,p in damsel.inventory()]})
        super().do_GET()
    def do_POST(self):
        if not self.valid_host() or self.headers.get('Origin')!=ORIGIN or self.headers.get('X-Discord-Tower')!='local-action':
            return self.json({'error':'Same-origin action required'},403)
        if self.path not in ('/api/check','/api/download','/api/open-installer','/api/open-manager','/api/open-discord'):
            return self.json({'error':'Unknown action'},404)
        if not busy.acquire(blocking=False):return self.json({'error':'Recovery action already running'},409)
        action=self.path
        def run():
            try:
                if action in ('/api/check','/api/download'):damsel.check(force=action=='/api/download')
                elif action=='/api/open-discord':os.startfile('discord://-/')
                elif action=='/api/open-installer':
                    state=damsel.read_state()
                    if not damsel.installer_valid(state):raise ValueError('Installer is missing or checksum changed; download it first.')
                    os.startfile(damsel.installer_path(state))
                else:
                    subprocess.Popen([str(Path(sys.executable).with_name('pythonw.exe')),str(BASE/'discord-damsel-20261015.py')],creationflags=subprocess.CREATE_NO_WINDOW)
            except Exception as exc:
                state=damsel.read_state();state['error']=str(exc);damsel.save_state(state)
            finally:busy.release()
        threading.Thread(target=run,daemon=True).start()
        self.json({'accepted':True},202)

if __name__=='__main__':
    try:
        server=ThreadingHTTPServer(('127.0.0.1',38764),Handler)
    except OSError:
        if '--open' in sys.argv:
            import urllib.request
            with urllib.request.urlopen(ORIGIN+'/api/status',timeout=3) as response:
                if 'channels' not in json.load(response):raise RuntimeError('Port is occupied by another program')
            os.startfile(ORIGIN+'/findastra-discord-presence-20261008.html')
        else:raise
    else:
        if '--open' in sys.argv:os.startfile(ORIGIN+'/findastra-discord-presence-20261008.html')
        server.serve_forever()
