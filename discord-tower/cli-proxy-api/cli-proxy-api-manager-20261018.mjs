// Discord Damsel's CLI Proxy API manager: tool discord-tower-v1.0-cli-proxy-api-v1.0 of Discord Tower.
// An Intelligent App, or Pet, by Astra. Written by Claude Opus 5.5 (claude-opus-5-5), 2026-10-18, at Astra's request.
//
// CLI Proxy API (router-for-me, MIT) is a third-party program. This tool installs the one verified release from
// quarantine, writes a config that keeps it on this PC, starts and stops it, and serves a small control page on
// http://127.0.0.1:38763/. It never signs anything in and never starts the proxy by itself: Start is Astra's click.
//
//   node cli-proxy-api-manager-20261018.mjs check         what is installed, configured, running (changes nothing)
//   node cli-proxy-api-manager-20261018.mjs install       copy the verified exe out of quarantine, write a safe config
//   node cli-proxy-api-manager-20261018.mjs console-key   type a console password (hidden) into the config
//   node cli-proxy-api-manager-20261018.mjs on | off      the tool's ON/OFF light (off also stops the proxy)
//   node cli-proxy-api-manager-20261018.mjs start | stop  the proxy itself
//   node cli-proxy-api-manager-20261018.mjs open          start the control page if needed and open it
//   node cli-proxy-api-manager-20261018.mjs serve [--port N] [--demo]
//
// Everything on the PC lives in %USERPROFILE%\.cli-proxy-api (the program's own default folder), not in AppData:
// the Claude and Codex apps keep a private copy of AppData, so a file written there from them is not the real one.
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync,
  renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TOOL = 'discord-tower-v1.0-cli-proxy-api-v1.0';
export const CONTROL_PORT = 38763;
export const PROXY_PORT = 8317;
export const RELEASE = JSON.parse(readFileSync(join(HERE, 'release-20261018.json'), 'utf8'));
export const OFFICIAL_PANEL = 'https://github.com/router-for-me/Cli-Proxy-API-Management-Center';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const LOG_LIMIT = 5 * 1024 * 1024;

/** Where everything lives. DAMSEL_CLI_PROXY_HOME and DAMSEL_CLI_PROXY_QUARANTINE are for tests. */
export function paths(env = process.env) {
  const profile = env.USERPROFILE || homedir();
  const home = env.DAMSEL_CLI_PROXY_HOME || join(profile, '.cli-proxy-api');
  const program = join(home, 'program', RELEASE.version);
  const damsel = join(home, 'damsel');
  return {
    home, program, exe: join(program, RELEASE.exe), config: join(home, 'config.yaml'), auth: join(home, 'auth'),
    damsel, settings: join(damsel, 'settings.json'), log: join(damsel, 'proxy.log'),
    quarantine: env.DAMSEL_CLI_PROXY_QUARANTINE || join(profile, 'Documents', "Astra's PetOS Quarantine", 'cliproxyapi-' + RELEASE.version),
  };
}

/* ---------- A small YAML reader: nested maps and lists of plain values, enough for the checks below ---------- */

function stripComment(line) {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote && line[i - 1] !== '\\') quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(raw) {
  const v = raw.trim();
  if (v === '') return null;
  if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === '[]') return [];
  if (v === '{}') return {};
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== null);
  return v;
}

/** Reads `a.b.c` paths and lists from YAML text. Anything it does not understand is skipped, never guessed. */
export function readYaml(text) {
  const values = new Map(), stack = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = stripComment(raw).replace(/\s+$/, '');
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    const isItem = body === '-' || body.startsWith('- ');
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.indent < indent || (isItem && top.indent === indent && top.open)) break;
      stack.pop();
    }
    const path = stack.map((s) => s.key).join('.');
    if (isItem) {
      if (!path) continue;
      const item = body.slice(1).trim();
      const list = Array.isArray(values.get(path)) ? values.get(path) : [];
      if (!/^[^"'\s][^:]*:\s/.test(item) && !/^[^"'\s][^:]*:$/.test(item)) list.push(scalar(item));
      else list.push({});
      values.set(path, list);
      continue;
    }
    const m = body.match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*))?$/);
    if (!m) continue;
    const key = m[1].replace(/^["']|["']$/g, '').trim();
    const full = path ? path + '.' + key : key;
    const value = m[2] === undefined ? null : scalar(m[2]);
    values.set(full, value);
    stack.push({ indent, key, open: value === null });
  }
  return values;
}

/* ---------- The config: what keeps the proxy on this PC ---------- */

/** A config with only what this tool needs; everything else keeps the program's defaults. */
export function makeConfig({ clientKey, authDir }) {
  if (!clientKey || clientKey.length < 24) throw new Error('A client key of at least 24 characters is needed.');
  return [
    '# CLI Proxy API settings, written by Discord Damsel\'s manager (discord-tower-v1.0-cli-proxy-api-v1.0).',
    '# Keep it on this PC. Never copy it into a repo: the client key below unlocks the proxy.',
    'config-version: 8',
    '',
    'server:',
    '  # Only this PC can reach the proxy. The manager refuses to start it with any other host.',
    '  host: "127.0.0.1"',
    '  port: ' + PROXY_PORT,
    '  discovery:',
    '    enabled: false',
    '',
    'management:',
    '  # The console (management.html) stays off until a password is set here.',
    '  # Set it with console-key (install-cli-proxy-api-20261018.cmd asks for it); the proxy hashes it on its next start.',
    '  allow-remote: false',
    '  secret-key: ""',
    '  disable-control-panel: false',
    '  # The console page is downloaded once, from the official repository, and never updated by itself.',
    '  disable-auto-update-panel: true',
    '  panel-github-repository: "' + OFFICIAL_PANEL + '"',
    '',
    '# The key a program on this PC sends to use the proxy (not a provider key).',
    'access:',
    '  api-keys:',
    '    - ' + JSON.stringify(clientKey),
    '',
    'oauth:',
    '  # Sign-ins the proxy keeps. Never a Claude (Anthropic) sign-in: the manager refuses to start with one here.',
    '  auth-dir: ' + JSON.stringify(authDir),
    '',
    'observability:',
    '  logs:',
    '    debug: false',
    '    logging-to-file: false',
    '    request-log: false',
    '  usage:',
    '    usage-statistics-enabled: false',
    '  pprof:',
    '    enable: false',
    '    addr: "127.0.0.1:8316"',
    '',
    '# Plugins are third-party code inside the proxy: off (the Shed rule in astras-pet-os).',
    'plugins:',
    '  enabled: false',
    '',
  ].join('\n');
}

const say = (level, id, text) => ({ level, id, text });

/** Checks a config. `block` stops the manager from starting the proxy; `warn` and `info` are shown. */
export function checkConfig(text) {
  const y = readYaml(text);
  const out = [];
  const get = (k) => y.get(k);
  if (get('config-version') !== 8) out.push(say('warn', 'version', 'config-version is not 8: this tool checks the v8 layout only.'));
  for (const legacy of ['host', 'remote-management', 'port']) {
    if (y.has(legacy)) out.push(say('block', 'legacy-' + legacy, `"${legacy}" at the top level is the old layout. Use the v8 layout (server.host, management) so it is clear which one applies.`));
  }
  const host = get('server.host');
  if (!LOCAL_HOSTS.has(String(host ?? '').trim())) {
    out.push(say('block', 'host', `server.host is ${host === undefined ? 'missing' : JSON.stringify(host)}: the proxy would listen on every network card. Set it to "127.0.0.1".`));
  }
  const port = Number(get('server.port') ?? PROXY_PORT);
  if (get('management.allow-remote') === true) out.push(say('block', 'remote', 'management.allow-remote is true: the console could be reached from other devices. Set it to false.'));
  const keys = get('access.api-keys');
  const clientKeys = Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : [];
  if (!clientKeys.length) out.push(say('block', 'no-key', 'access.api-keys has no client key. Run install again, or add a long random key.'));
  for (const k of clientKeys) {
    if (/^your-api-key/i.test(k) || /^(changeme|example|test|password)/i.test(k) || k.length < 24) {
      out.push(say('block', 'weak-key', 'access.api-keys has a sample or short key (under 24 characters). Replace it with a long random key.'));
      break;
    }
  }
  if (get('plugins.enabled') === true) out.push(say('block', 'plugins', 'plugins.enabled is true: plugins run third-party code inside the proxy. Turning them on is Astra\'s, through the Shed.'));
  if (get('server.discovery.enabled') === true) out.push(say('block', 'discovery', 'server.discovery.enabled is true: the proxy would announce itself on the local network. Set it to false.'));
  if (get('observability.pprof.enable') === true) {
    const addr = String(get('observability.pprof.addr') ?? '');
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(addr)) out.push(say('block', 'pprof', 'observability.pprof is on and not bound to 127.0.0.1. Turn it off.'));
    else out.push(say('warn', 'pprof', 'observability.pprof (a debug server) is on. Turn it off when you are done.'));
  }
  const panel = get('management.panel-github-repository');
  if (panel !== undefined && panel !== null && String(panel).replace(/\/+$|\.git$/g, '') !== OFFICIAL_PANEL) {
    out.push(say('block', 'panel', 'management.panel-github-repository is not the official console. The console page would come from somewhere else.'));
  }
  if (get('observability.logs.request-log') === true) out.push(say('warn', 'request-log', 'observability.logs.request-log is on: prompts and answers are written to disk.'));
  const proxies = get('server.trusted-proxies');
  if (Array.isArray(proxies) && proxies.length) out.push(say('warn', 'trusted-proxies', 'server.trusted-proxies is not empty.'));
  if (get('server.github-token')) out.push(say('warn', 'github-token', 'server.github-token holds a GitHub token. The proxy does not need one.'));
  const consoleOn = Boolean(get('management.secret-key')) && get('management.disable-control-panel') !== true;
  out.push(say('info', 'console', consoleOn ? 'Console: on (password set).' : 'Console: off. Set a password with console-key to turn it on.'));
  const authDir = get('oauth.auth-dir');
  return { problems: out, port, console: consoleOn, authDir: typeof authDir === 'string' && authDir ? authDir : null, clientKeys: clientKeys.length };
}

/** Counts the sign-ins in the proxy's folder by kind. Reads only each file's `type`, never a token. */
export function scanSignIns(dir) {
  const counts = { claude: 0, openai: 0, google: 0, other: 0 };
  if (!dir || !existsSync(dir)) return counts;
  for (const name of readdirSync(dir)) {
    if (!name.toLowerCase().endsWith('.json')) continue;
    let type = '';
    try { type = String(JSON.parse(readFileSync(join(dir, name), 'utf8'))?.type ?? ''); } catch { /* unreadable: counted by name */ }
    const kind = (type || name).toLowerCase();
    if (/claude|anthropic/.test(kind)) counts.claude++;
    else if (/codex|openai|chatgpt/.test(kind)) counts.openai++;
    else if (/gemini|google|aistudio|vertex|antigravity/.test(kind)) counts.google++;
    else counts.other++;
  }
  return counts;
}

function expandHome(p, env = process.env) {
  if (!p) return p;
  return p.startsWith('~') ? join(env.USERPROFILE || homedir(), p.slice(1)) : p;
}

/** The environment the proxy gets: what Windows and Go need, never Astra's keys or tokens. */
export function cleanEnv(env = process.env) {
  const keep = /^(SystemRoot|SystemDrive|windir|TEMP|TMP|USERPROFILE|HOMEDRIVE|HOMEPATH|LOCALAPPDATA|APPDATA|ProgramData|PATH|PATHEXT|COMPUTERNAME|USERNAME|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|OS|HTTP_PROXY|HTTPS_PROXY|NO_PROXY)$/i;
  return Object.fromEntries(Object.entries(env).filter(([k]) => keep.test(k)));
}

/* ---------- Files, settings, hashes ---------- */

const hashCache = new Map();
export function sha256File(file) {
  const st = statSync(file);
  const cached = hashCache.get(file);
  if (cached && cached.size === st.size && cached.mtimeMs === st.mtimeMs) return cached.hash;
  const hash = createHash('sha256'), fd = openSync(file, 'r'), buf = Buffer.alloc(1 << 20);
  try { let n; while ((n = readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, n)); } finally { closeSync(fd); }
  const digest = hash.digest('hex');
  hashCache.set(file, { size: st.size, mtimeMs: st.mtimeMs, hash: digest });
  return digest;
}

export function readSettings(p) {
  try { return { enabled: false, maintenance: false, ...JSON.parse(readFileSync(p.settings, 'utf8')) }; }
  catch { return { enabled: false, maintenance: false }; }
}
export function writeSettings(p, settings) {
  mkdirSync(p.damsel, { recursive: true });
  writeFileSync(p.settings, JSON.stringify({ schema: 1, ...settings, changed: new Date().toISOString() }, null, 2));
}

const samePath = (a, b) => Boolean(a && b) && a.replace(/\//g, '\\').toLowerCase() === b.replace(/\//g, '\\').toLowerCase();

/* ---------- The PC: processes, ports, the browser. Tests pass their own. ---------- */

export const realSystem = {
  installedHash: (file) => (existsSync(file) ? sha256File(file) : null),
  portOpen(port, host = '127.0.0.1', ms = 800) {
    return new Promise((resolve) => {
      const s = connect({ port, host });
      const done = (ok) => { s.destroy(); resolve(ok); };
      s.setTimeout(ms, () => done(false));
      s.once('connect', () => done(true));
      s.once('error', () => done(false));
    });
  },
  processes() {
    if (process.platform !== 'win32') return [];
    try {
      const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='" + RELEASE.exe + "'\" | Select-Object ProcessId,ExecutablePath | ConvertTo-Json -Compress"],
      { encoding: 'utf8', windowsHide: true, timeout: 15000 }).trim();
      if (!out) return [];
      return [].concat(JSON.parse(out)).map((x) => ({ pid: Number(x.ProcessId), path: x.ExecutablePath || '' }));
    } catch { return []; }
  },
  kill(pid) {
    try { execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); return true; }
    catch { return false; }
  },
  spawnProxy(exe, args, { cwd, env, log }) {
    const fd = openSync(log, 'a');
    try {
      const child = spawn(exe, args, { cwd, env, detached: true, windowsHide: true, stdio: ['ignore', fd, fd] });
      child.unref();
      return child.pid;
    } finally { closeSync(fd); }
  },
  spawnControls(port) {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', '--port', String(port)],
      { cwd: HERE, detached: true, windowsHide: true, stdio: 'ignore' });
    child.unref();
  },
  openUrl(url) { spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, windowsHide: true, stdio: 'ignore' }).unref(); },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/* ---------- What the page and the commands show ---------- */

export async function status(sys, p) {
  const settings = readSettings(p);
  let hash = null;
  try { hash = sys.installedHash(p.exe); } catch { hash = ''; }
  const installed = hash !== null;
  const verified = installed ? hash === RELEASE.exe_sha256 : null;
  const configText = existsSync(p.config) ? readFileSync(p.config, 'utf8') : null;
  const config = configText === null ? null : checkConfig(configText);
  const signIns = scanSignIns(expandHome(config?.authDir) || p.auth);
  const port = config?.port ?? PROXY_PORT;
  const ours = sys.processes().filter((x) => samePath(x.path, p.exe));
  const answering = await sys.portOpen(port);
  const zip = join(p.quarantine, RELEASE.zip);
  const blocks = [];
  if (!settings.enabled) blocks.push('The tool is OFF: turn its left light green first.');
  if (!installed) blocks.push('Not installed yet: run install-cli-proxy-api-20261018.cmd.');
  else if (!verified) blocks.push(`The installed ${RELEASE.exe} is not the verified ${RELEASE.version}: run install again.`);
  if (!config) blocks.push('No config yet: run install-cli-proxy-api-20261018.cmd.');
  else for (const pr of config.problems) if (pr.level === 'block') blocks.push(pr.text);
  if (signIns.claude) blocks.push(`A Claude sign-in is in the proxy's folder (${signIns.claude}). Never sign it in with your Claude login: delete that file first.`);
  if (answering && !ours.length) blocks.push(`Something else is already using port ${port}.`);
  const health = !installed ? 'not-installed' : ours.length && answering ? 'running' : ours.length ? 'starting' : answering ? 'port-busy' : 'stopped';
  return {
    tool: TOOL, program: RELEASE.program, version: RELEASE.version, health, port,
    enabled: settings.enabled, maintenance: settings.maintenance, guard: settings.guard || null,
    installed, verified, console: Boolean(config?.console), consoleUrl: `http://127.0.0.1:${port}/management.html`,
    problems: config ? config.problems : [], signIns, blocks, pids: ours.map((x) => x.pid),
    quarantine: { found: existsSync(zip) }, home: shortPath(p.home),
  };
}

/** A path as %USERPROFILE%\…, so the page and its pictures never show the Windows user name. */
export function shortPath(path, env = process.env) {
  for (const [name, value] of [['%TEMP%', env.TEMP || tmpdir()], ['%USERPROFILE%', env.USERPROFILE || homedir()]]) {
    if (value && path.toLowerCase().startsWith(value.toLowerCase())) return name + path.slice(value.length);
  }
  return path;
}

export async function start(sys, p) {
  const st = await status(sys, p);
  if (st.health === 'running' || st.health === 'starting') return st;
  if (st.blocks.length) throw new Error('Not started. ' + st.blocks.join(' '));
  mkdirSync(p.damsel, { recursive: true });
  if (existsSync(p.log) && statSync(p.log).size > LOG_LIMIT) renameSync(p.log, p.log.replace(/\.log$/, '.old.log'));
  sys.spawnProxy(p.exe, ['-config', p.config], { cwd: p.program, env: cleanEnv(), log: p.log });
  for (let i = 0; i < 30; i++) {
    await sys.sleep(500);
    const now = await status(sys, p);
    if (now.health === 'running') return now;
  }
  return status(sys, p);
}

export async function stop(sys, p) {
  for (const x of sys.processes()) if (samePath(x.path, p.exe)) sys.kill(x.pid);
  await sys.sleep(300);
  return status(sys, p);
}

export async function setEnabled(sys, p, on) {
  writeSettings(p, { ...readSettings(p), enabled: Boolean(on), guard: null });
  if (!on) return stop(sys, p);
  return status(sys, p);
}

export async function setMaintenance(sys, p, on) {
  writeSettings(p, { ...readSettings(p), maintenance: Boolean(on) });
  return status(sys, p);
}

/** While the control page runs: stop the proxy if a Claude sign-in appears or the tool is turned OFF. */
export async function guardTick(sys, p) {
  const st = await status(sys, p);
  if (!(st.health === 'running' || st.health === 'starting')) return null;
  let why = null;
  if (st.signIns.claude) why = 'Stopped: a Claude sign-in appeared in its folder. Delete it before starting again.';
  else if (!st.enabled) why = 'Stopped: the tool is OFF.';
  if (!why) return null;
  await stop(sys, p);
  writeSettings(p, { ...readSettings(p), guard: { at: new Date().toISOString(), text: why } });
  return why;
}

/* ---------- Install (Astra runs it) ---------- */

export function install(p, { log = console.log, clientKey = randomBytes(24).toString('base64url') } = {}) {
  const zip = join(p.quarantine, RELEASE.zip);
  if (!existsSync(zip)) throw new Error(`${RELEASE.zip} is not in quarantine (${p.quarantine}). Download it from ${RELEASE.release} first.`);
  if (sha256File(zip) !== RELEASE.zip_sha256) throw new Error(`${RELEASE.zip} does not match the verified checksum. Nothing was installed.`);
  log(`Verified ${RELEASE.zip} (${RELEASE.version}).`);
  let source = join(p.quarantine, 'extracted', RELEASE.exe), temp = null;
  if (!existsSync(source) || sha256File(source) !== RELEASE.exe_sha256) {
    temp = mkdtempSync(join(tmpdir(), 'damsel-cli-proxy-'));
    execFileSync('tar.exe', ['-xf', zip, '-C', temp, RELEASE.exe], { windowsHide: true, stdio: 'ignore' });
    source = join(temp, RELEASE.exe);
    if (!existsSync(source) || sha256File(source) !== RELEASE.exe_sha256) throw new Error(`${RELEASE.exe} inside the zip does not match. Nothing was installed.`);
  }
  try {
    mkdirSync(p.program, { recursive: true });
    copyFileSync(source, p.exe);
    if (sha256File(p.exe) !== RELEASE.exe_sha256) throw new Error('The copied program does not match. Delete ' + p.program + ' and try again.');
    const license = join(p.quarantine, 'extracted', 'LICENSE');
    if (existsSync(license)) copyFileSync(license, join(p.program, 'LICENSE'));
  } finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
  log(`Installed ${RELEASE.program} ${RELEASE.version} in ${p.program}.`);
  mkdirSync(p.auth, { recursive: true });
  if (!existsSync(p.config)) {
    writeFileSync(p.config, makeConfig({ clientKey, authDir: p.auth }));
    log(`Wrote ${p.config}: only this PC can reach it, a new random client key, console off, plugins off.`);
  } else {
    log(`Kept your existing ${p.config}.`);
    for (const pr of checkConfig(readFileSync(p.config, 'utf8')).problems) log(`  ${pr.level}: ${pr.text}`);
  }
  if (!existsSync(p.settings)) writeSettings(p, { enabled: false, maintenance: false });
  log('Not started. Open the controls (cli-proxy-api-20261018.cmd), turn the tool ON, then press Start.');
}

/** Writes a console password into management.secret-key (the proxy hashes it on its next start). */
export function setConsoleKey(p, secret) {
  if (!existsSync(p.config)) throw new Error('No config yet: run install first.');
  if (typeof secret !== 'string' || secret.length < 12) throw new Error('Use at least 12 characters.');
  const lines = readFileSync(p.config, 'utf8').split(/\r?\n/);
  let inManagement = false, done = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) inManagement = /^management:\s*(#.*)?$/.test(lines[i]);
    else if (inManagement && /^\s+secret-key:/.test(lines[i])) { lines[i] = lines[i].replace(/secret-key:.*$/, 'secret-key: ' + JSON.stringify(secret)); done = true; break; }
  }
  if (!done) throw new Error('No management.secret-key line in the config. Add one under management:, or run install with a fresh config.');
  writeFileSync(p.config, lines.join('\n'));
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question) || s === '\r\n' || s === '\n') process.stdout.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

/* ---------- The control page ---------- */

function readBody(req, limit = 2048) {
  return new Promise((resolve, reject) => {
    let size = 0; const parts = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Too large')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { resolve(parts.length ? JSON.parse(Buffer.concat(parts).toString('utf8')) : {}); } catch { reject(new Error('Not JSON')); } });
    req.on('error', reject);
  });
}

export function createControlServer({ sys, p, port = CONTROL_PORT, onQuit = () => {} }) {
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  const page = () => readFileSync(join(HERE, 'control-page-20261018.html'), 'utf8');
  return createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => {
      const headers = { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
      if (type === 'text/html') headers['Content-Security-Policy'] = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
      res.writeHead(code, headers);
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
    try {
      // Only this PC's own address: a web page that renames itself to 127.0.0.1 (DNS rebinding) is turned away.
      if (!hosts.has(req.headers.host)) return send(421, { error: 'Wrong host.' });
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (req.method === 'GET' && url.pathname === '/') return send(200, page(), 'text/html');
      if (req.method === 'GET' && url.pathname === '/api/status') return send(200, await status(sys, p));
      if (req.method !== 'POST') return send(405, { error: 'Not allowed.' });
      // Only this page can press the buttons: same origin, plus a header other sites cannot send without asking.
      if (!origins.has(req.headers.origin) || req.headers['x-discord-tower'] !== 'local-action') return send(403, { error: 'Only the control page can do that.' });
      const body = await readBody(req);
      if (url.pathname === '/api/start') return send(200, await start(sys, p));
      if (url.pathname === '/api/stop') return send(200, await stop(sys, p));
      if (url.pathname === '/api/enabled') return send(200, await setEnabled(sys, p, body.on === true));
      if (url.pathname === '/api/maintenance') return send(200, await setMaintenance(sys, p, body.on === true));
      if (url.pathname === '/api/quit') { send(200, { ok: true }); return setTimeout(onQuit, 50); }
      return send(404, { error: 'Not found.' });
    } catch (error) {
      return send(409, { error: error.message });
    }
  });
}

/** A pretend PC for checking the page: the verified program "is installed", Start and Stop only flip a flag. */
export function demoSystem(exe) {
  const state = { running: false };
  return {
    installedHash: () => RELEASE.exe_sha256,
    portOpen: async () => state.running,
    processes: () => (state.running ? [{ pid: 4242, path: exe }] : []),
    kill: () => { state.running = false; return true; },
    spawnProxy: () => { state.running = true; return 4242; },
    spawnControls() {}, openUrl() {}, sleep: async () => {},
  };
}

/* ---------- Commands ---------- */

function print(st) {
  const lines = [
    `${st.tool}: ${st.enabled ? 'ON' : 'OFF'}${st.maintenance ? ', marked as requiring maintenance' : ''}`,
    `${st.program} ${st.version}: ${st.health}${st.pids.length ? ` (process ${st.pids.join(', ')})` : ''}, port ${st.port}`,
    `Installed: ${st.installed ? (st.verified ? 'yes, verified' : 'yes, NOT the verified build') : 'no'} · in quarantine: ${st.quarantine.found ? 'yes' : 'no'}`,
    `Console: ${st.console ? st.consoleUrl : 'off'}`,
    `Sign-ins: Claude ${st.signIns.claude}, OpenAI ${st.signIns.openai}, Google ${st.signIns.google}, other ${st.signIns.other}`,
    ...st.problems.filter((x) => x.level !== 'info').map((x) => `  ${x.level}: ${x.text}`),
    ...(st.blocks.length ? ['Start is blocked:', ...st.blocks.map((b) => '  - ' + b)] : ['Ready to start.']),
  ];
  console.log(lines.join('\n'));
}

export async function main(argv, sys = realSystem, p = paths()) {
  const [command = 'check', ...rest] = argv;
  const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  switch (command) {
    case 'check': case 'status': return print(await status(sys, p));
    case 'install': return install(p);
    case 'console-key': {
      const a = await askHidden('Type a console password (at least 12 characters; Enter to skip): ');
      if (!a) return console.log('Skipped: the console stays off.');
      const b = await askHidden('Type it again: ');
      if (a !== b) throw new Error('The two did not match. Nothing was changed.');
      setConsoleKey(p, a);
      return console.log('Saved. The proxy hashes it on its next start; restart the proxy to turn the console on.');
    }
    case 'on': return print(await setEnabled(sys, p, true));
    case 'off': return print(await setEnabled(sys, p, false));
    case 'start': return print(await start(sys, p));
    case 'stop': return print(await stop(sys, p));
    case 'open': {
      const port = Number(flag('--port') || CONTROL_PORT);
      if (!(await sys.portOpen(port))) { sys.spawnControls(port); for (let i = 0; i < 20 && !(await sys.portOpen(port)); i++) await sys.sleep(250); }
      sys.openUrl(`http://127.0.0.1:${port}/`);
      return console.log(`Controls: http://127.0.0.1:${port}/`);
    }
    case 'serve': {
      const port = Number(flag('--port') || CONTROL_PORT);
      const demo = rest.includes('--demo');
      if (demo) {
        // The demo never touches the real folder: a fresh temporary one with a config this tool writes.
        p = paths({ ...process.env, DAMSEL_CLI_PROXY_HOME: mkdtempSync(join(tmpdir(), 'damsel-cli-proxy-demo-')) });
        mkdirSync(p.auth, { recursive: true });
        writeFileSync(p.config, makeConfig({ clientKey: randomBytes(24).toString('base64url'), authDir: p.auth }));
      }
      const useSys = demo ? demoSystem(p.exe) : sys;
      let timer = null;
      const server = createControlServer({ sys: useSys, p, port, onQuit: () => { clearInterval(timer); server.close(); } });
      server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `The controls already run on port ${port}.` : e.message); process.exitCode = e.code === 'EADDRINUSE' ? 0 : 1; });
      server.listen(port, '127.0.0.1', () => console.log(`${TOOL} controls on http://127.0.0.1:${port}/${demo ? ' (demo: pretend PC)' : ''}`));
      timer = setInterval(() => { guardTick(useSys, p).catch(() => {}); }, 5000);
      return server;
    }
    default:
      throw new Error(`Unknown command "${command}". Use check, install, console-key, on, off, start, stop, open or serve.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
