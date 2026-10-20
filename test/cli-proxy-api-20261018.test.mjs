// Discord Damsel's CLI Proxy API manager (discord-tower-v1.0-cli-proxy-api-v1.0). Every test uses a pretend PC and
// temporary folders: the real cli-proxy-api.exe is never started.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as M from '../discord-tower/cli-proxy-api/cli-proxy-api-manager-20261018.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const folder = join(root, 'discord-tower/cli-proxy-api');
const blocks = (text) => M.checkConfig(text).problems.filter((p) => p.level === 'block').map((p) => p.id);

function temp() {
  const dir = mkdtempSync(join(tmpdir(), 'damsel-cpa-test-'));
  const p = M.paths({ USERPROFILE: dir, DAMSEL_CLI_PROXY_HOME: join(dir, 'home'), DAMSEL_CLI_PROXY_QUARANTINE: join(dir, 'quarantine') });
  return { dir, p, done: () => rmSync(dir, { recursive: true, force: true }) };
}

// `older`: copies of an earlier pinned release this tool installed, still running and answering on the proxy port.
function fakePC(p, { hash = M.RELEASE.exe_sha256, busy = false, others = [], older = [] } = {}) {
  const pc = { running: false, spawned: [], killed: [] }, old = [...older];
  Object.assign(pc, {
    installedHash: () => hash,
    portOpen: async () => pc.running || busy || old.length > 0,
    processes: () => [...(pc.running ? [{ pid: 7, path: p.exe }] : []), ...old, ...others],
    kill: (pid) => { pc.killed.push(pid); if (pid === 7) pc.running = false; if (old.some((x) => x.pid === pid)) old.splice(old.findIndex((x) => x.pid === pid), 1); return true; },
    spawnProxy: (exe, args, opts) => { pc.spawned.push({ exe, args, opts }); pc.running = true; return 7; },
    spawnControls() {}, openUrl() {}, sleep: async () => {},
  });
  return pc;
}

function ready(p, extra = {}) {
  mkdirSync(p.home, { recursive: true });
  writeFileSync(p.config, M.makeConfig({ clientKey: 'k'.repeat(32), authDir: p.auth }));
  M.writeSettings(p, { enabled: true, maintenance: false, ...extra });
}

test('the pinned release is the one checked on 2026-10-19 (v8.0.34), and it is the only pin', () => {
  assert.equal(M.RELEASE.version, 'v8.0.34');
  assert.match(M.RELEASE.zip_sha256, /^[0-9a-f]{64}$/);
  assert.match(M.RELEASE.exe_sha256, /^[0-9a-f]{64}$/);
  assert.equal(M.RELEASE.source, 'https://github.com/router-for-me/CLIProxyAPI');
  assert.equal(M.RELEASE.release, `${M.RELEASE.source}/releases/tag/${M.RELEASE.version}`);
  assert.equal(M.RELEASE.zip, `CLIProxyAPI_${M.RELEASE.version.slice(1)}_windows_amd64.zip`);
  assert.equal(M.paths({ USERPROFILE: 'X' }).quarantine, join('X', 'Documents', "Astra's PetOS Quarantine", 'cliproxyapi-v8.0.34'));
  assert.deepEqual(readdirSync(folder).filter((f) => /^release-\d{8}\.json$/.test(f)), ['release-20261019.json']);
});

test('the config it writes keeps the proxy on this PC and passes its own check', () => {
  const text = M.makeConfig({ clientKey: 'x'.repeat(32), authDir: 'C:\\temp\\auth' });
  const r = M.checkConfig(text);
  assert.deepEqual(r.problems.filter((p) => p.level !== 'info'), []);
  assert.equal(r.console, false);
  assert.equal(r.port, 8317);
  assert.equal(r.authDir, 'C:\\temp\\auth');
  const y = M.readYaml(text);
  assert.equal(y.get('server.host'), '127.0.0.1');
  assert.equal(y.get('management.allow-remote'), false);
  assert.equal(y.get('plugins.enabled'), false);
  assert.equal(y.get('management.disable-auto-update-panel'), true);
  assert.throws(() => M.makeConfig({ clientKey: 'short', authDir: 'x' }), /24 characters/);
});

test('the sample config\'s traps are refused: every network card and the sample keys', () => {
  const sample = ['config-version: 8', 'server:', '  # Default is empty ("") to bind all interfaces', '  host: ""', '  port: 8317',
    'management:', '  allow-remote: false', '  secret-key: ""', 'access:', '  api-keys:', '    - "your-api-key-1"', '    - "your-api-key-2"'].join('\n');
  assert.deepEqual(blocks(sample), ['host', 'weak-key']);
});

test('remote console, plugins, network discovery, a public debug server and another console source are refused', () => {
  const base = M.makeConfig({ clientKey: 'y'.repeat(32), authDir: 'a' });
  assert.deepEqual(blocks(base.replace('allow-remote: false', 'allow-remote: true')), ['remote']);
  assert.deepEqual(blocks(base.replace(/plugins:\n {2}enabled: false/, 'plugins:\n  enabled: true')), ['plugins']);
  assert.deepEqual(blocks(base.replace(/discovery:\n {4}enabled: false/, 'discovery:\n    enabled: true')), ['discovery']);
  assert.deepEqual(blocks(base.replace(/enable: false\n {4}addr: "127.0.0.1:8316"/, 'enable: true\n    addr: "0.0.0.0:8316"')), ['pprof']);
  assert.deepEqual(blocks(base.replace(M.OFFICIAL_PANEL, 'https://github.com/someone/else')), ['panel']);
  assert.deepEqual(blocks('host: "0.0.0.0"\n' + base), ['legacy-host']);
  assert.deepEqual(blocks(base.replace('host: "127.0.0.1"', 'host: "0.0.0.0"')), ['host']);
  assert.deepEqual(blocks(base.replace(/access:\n {2}api-keys:\n {4}- "y+"/, 'access:\n  api-keys: []')), ['no-key']);
});

test('the YAML reader handles comments, quotes and lists at the same indent', () => {
  const y = M.readYaml('a:\n  b: "x # not a comment" # a comment\n  list:\n  - one\n  - "two"\n  inline: [1, 2]\nc: true');
  assert.equal(y.get('a.b'), 'x # not a comment');
  assert.deepEqual(y.get('a.list'), ['one', 'two']);
  assert.deepEqual(y.get('a.inline'), [1, 2]);
  assert.equal(y.get('c'), true);
});

test('the console password goes only into management.secret-key', () => {
  const t = temp();
  try {
    ready(t.p);
    M.setConsoleKey(t.p, 'correct horse battery');
    const y = M.readYaml(readFileSync(t.p.config, 'utf8'));
    assert.equal(y.get('management.secret-key'), 'correct horse battery');
    assert.equal(M.checkConfig(readFileSync(t.p.config, 'utf8')).console, true);
    assert.throws(() => M.setConsoleKey(t.p, 'short'), /12 characters/);
  } finally { t.done(); }
});

test('sign-ins are counted by kind without reading tokens', () => {
  const t = temp();
  try {
    mkdirSync(t.p.auth, { recursive: true });
    writeFileSync(join(t.p.auth, 'claude-someone.json'), JSON.stringify({ type: 'claude', access_token: 'never-read' }));
    writeFileSync(join(t.p.auth, 'a.json'), JSON.stringify({ type: 'codex' }));
    writeFileSync(join(t.p.auth, 'gemini-x.json'), 'not json');
    writeFileSync(join(t.p.auth, 'notes.txt'), 'ignored');
    assert.deepEqual(M.scanSignIns(t.p.auth), { claude: 1, openai: 1, google: 1, other: 0 });
  } finally { t.done(); }
});

test('the page shows folders as %USERPROFILE% or %TEMP%, never the Windows user name', () => {
  const env = { USERPROFILE: 'C:/Users/someone', TEMP: 'C:/Users/someone/AppData/Local/Temp' };
  assert.equal(M.shortPath('C:/Users/someone/.cli-proxy-api', env), '%USERPROFILE%/.cli-proxy-api');
  assert.equal(M.shortPath('c:/users/someone/AppData/Local/Temp/x', env), '%TEMP%/x');
  assert.equal(M.shortPath('D:/elsewhere', env), 'D:/elsewhere');
});

test('the proxy gets what Windows needs, never Astra\'s keys or tokens', () => {
  const env = M.cleanEnv({ Path: 'C:\\Windows', SystemRoot: 'C:\\Windows', OPENAI_API_KEY: 'sk', ANTHROPIC_API_KEY: 'sk', GITHUB_TOKEN: 'gh', PGSTORE_DSN: 'pg', HTTPS_PROXY: 'http://p' });
  assert.deepEqual(Object.keys(env).sort(), ['HTTPS_PROXY', 'Path', 'SystemRoot']);
});

test('it starts only when ON, verified, configured and safe; Start is the only thing that runs it', async () => {
  const t = temp();
  try {
    ready(t.p, { enabled: false });
    const pc = fakePC(t.p);
    await assert.rejects(M.start(pc, t.p), /tool is OFF/);
    assert.equal(pc.spawned.length, 0);
    await M.setEnabled(pc, t.p, true);
    const st = await M.start(pc, t.p);
    assert.equal(st.health, 'running');
    assert.equal(pc.spawned.length, 1);
    assert.deepEqual(pc.spawned[0].args, ['-config', t.p.config]);
    assert.equal(pc.spawned[0].exe, t.p.exe);
    assert.equal(pc.spawned[0].opts.env.OPENAI_API_KEY, undefined);
    assert.equal((await M.stop(pc, t.p)).health, 'stopped');
  } finally { t.done(); }
});

test('it refuses a build that is not the verified one, a busy port, an unsafe config and a Claude sign-in', async () => {
  const t = temp();
  try {
    ready(t.p);
    await assert.rejects(M.start(fakePC(t.p, { hash: '0'.repeat(64) }), t.p), /not the verified v8\.0\.34/);
    await assert.rejects(M.start(fakePC(t.p, { hash: null }), t.p), /Not installed/);
    await assert.rejects(M.start(fakePC(t.p, { busy: true }), t.p), /already using port 8317/);
    writeFileSync(t.p.config, readFileSync(t.p.config, 'utf8').replace('host: "127.0.0.1"', 'host: ""'));
    await assert.rejects(M.start(fakePC(t.p), t.p), /every network card/);
    ready(t.p);
    mkdirSync(t.p.auth, { recursive: true });
    writeFileSync(join(t.p.auth, 'claude-me.json'), JSON.stringify({ type: 'claude' }));
    await assert.rejects(M.start(fakePC(t.p), t.p), /Never sign it in with your Claude login/);
  } finally { t.done(); }
});

test('a Claude sign-in that appears while it runs, or turning the tool OFF, stops it', async () => {
  const t = temp();
  try {
    ready(t.p);
    const pc = fakePC(t.p);
    await M.start(pc, t.p);
    assert.equal(await M.guardTick(pc, t.p), null);
    mkdirSync(t.p.auth, { recursive: true });
    writeFileSync(join(t.p.auth, 'claude-me.json'), JSON.stringify({ type: 'claude' }));
    assert.match(await M.guardTick(pc, t.p), /Claude sign-in/);
    assert.equal(pc.running, false);
    assert.match(M.readSettings(t.p).guard.text, /Claude sign-in/);
    rmSync(join(t.p.auth, 'claude-me.json'));
    await M.start(pc, t.p);
    assert.equal((await M.setEnabled(pc, t.p, false)).health, 'stopped');
  } finally { t.done(); }
});

test('Stop only stops the copy it installed', async () => {
  const t = temp();
  try {
    ready(t.p);
    const pc = fakePC(t.p, { others: [{ pid: 99, path: 'D:\\elsewhere\\cli-proxy-api.exe' }] });
    await M.start(pc, t.p);
    await M.stop(pc, t.p);
    assert.deepEqual(pc.killed, [7]);
  } finally { t.done(); }
});

test('after the pin moves, an older copy it installed is still its own: Start waits; Stop, OFF and the Claude guard stop it', async () => {
  const t = temp();
  try {
    ready(t.p);
    const oldExe = join(t.p.programs, 'v8.0.33', M.RELEASE.exe);
    assert.equal(M.ownCopy(t.p, oldExe), true);
    assert.equal(M.ownCopy(t.p, t.p.exe), true);
    for (const stranger of ['D:\\elsewhere\\cli-proxy-api.exe', join(t.p.programs, M.RELEASE.exe), join(t.p.programs, 'v8.0.33', 'nested', M.RELEASE.exe),
      join(t.p.programs, 'v8.0.33', 'other.exe'), join(t.p.home, M.RELEASE.exe), t.p.programs + '\\..\\' + M.RELEASE.exe, '']) {
      assert.equal(M.ownCopy(t.p, stranger), false, stranger);
    }

    let pc = fakePC(t.p, { older: [{ pid: 33, path: oldExe }], others: [{ pid: 99, path: 'D:\\elsewhere\\cli-proxy-api.exe' }] });
    const st = await M.status(pc, t.p);
    assert.equal(st.health, 'running-older');
    assert.deepEqual(st.older, ['v8.0.33']);
    assert.ok(st.blocks.some((b) => /older copy it installed is still running \(v8\.0\.33\)/.test(b)), st.blocks.join(' | '));
    assert.ok(!st.blocks.some((b) => /Something else/.test(b)));
    await assert.rejects(M.start(pc, t.p), /older copy/);
    assert.equal(pc.spawned.length, 0);
    assert.equal((await M.stop(pc, t.p)).health, 'stopped');
    assert.deepEqual(pc.killed, [33], 'never the copy elsewhere');
    assert.equal((await M.start(pc, t.p)).health, 'running');
    assert.equal(pc.spawned[0].exe, t.p.exe, 'Start runs only the pinned release');

    pc = fakePC(t.p, { older: [{ pid: 34, path: oldExe }] });
    assert.equal((await M.setEnabled(pc, t.p, false)).health, 'stopped');
    assert.deepEqual(pc.killed, [34], 'OFF stops the older copy too');

    ready(t.p);
    pc = fakePC(t.p, { older: [{ pid: 35, path: oldExe }] });
    mkdirSync(t.p.auth, { recursive: true });
    writeFileSync(join(t.p.auth, 'claude-me.json'), JSON.stringify({ type: 'claude' }));
    assert.match(await M.guardTick(pc, t.p), /Claude sign-in/);
    assert.deepEqual(pc.killed, [35], 'the Claude guard stops the older copy too');
  } finally { t.done(); }
});

test('install refuses a download that is missing or does not match the checksum', () => {
  const t = temp();
  try {
    assert.throws(() => M.install(t.p, { log() {} }), /not in quarantine/);
    mkdirSync(t.p.quarantine, { recursive: true });
    writeFileSync(join(t.p.quarantine, M.RELEASE.zip), 'not the real zip');
    assert.throws(() => M.install(t.p, { log() {} }), /does not match the verified checksum/);
  } finally { t.done(); }
});

function call(port, { method = 'GET', path = '/api/status', host = `127.0.0.1:${port}`, headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: host, ...headers } }, (res) => {
      let data = ''; res.on('data', (c) => { data += c; }); res.on('end', () => resolve({ code: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('the control page answers only this PC\'s address, and only the page itself can press its buttons', async () => {
  const t = temp();
  const port = 40000 + Math.floor(Math.random() * 5000);
  ready(t.p);
  const pc = fakePC(t.p);
  const server = M.createControlServer({ sys: pc, p: t.p, port });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  try {
    const page = await call(port, { path: '/' });
    assert.equal(page.code, 200);
    assert.match(page.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal((await call(port)).code, 200);
    assert.equal((await call(port, { host: 'evil.example:' + port })).code, 421, 'DNS rebinding');
    const origin = `http://127.0.0.1:${port}`;
    assert.equal((await call(port, { method: 'POST', path: '/api/start' })).code, 403);
    assert.equal((await call(port, { method: 'POST', path: '/api/start', headers: { Origin: 'https://evil.example', 'X-Discord-Tower': 'local-action' } })).code, 403);
    assert.equal((await call(port, { method: 'POST', path: '/api/start', headers: { Origin: origin } })).code, 403);
    assert.equal(pc.spawned.length, 0);
    const ok = await call(port, { method: 'POST', path: '/api/start', headers: { Origin: origin, 'X-Discord-Tower': 'local-action' }, body: '{}' });
    assert.equal(ok.code, 200);
    assert.equal(JSON.parse(ok.data).health, 'running');
  } finally { server.close(); t.done(); }
});

test('the page puts status on screen as text, and the launchers never start the proxy', () => {
  const page = readFileSync(join(folder, 'control-page-20261018.html'), 'utf8');
  assert.doesNotMatch(page, /innerHTML|outerHTML|insertAdjacentHTML|eval\(/);
  for (const cmd of ['cli-proxy-api-20261018.cmd', 'install-cli-proxy-api-20261018.cmd']) {
    const text = readFileSync(join(folder, cmd), 'utf8');
    assert.doesNotMatch(text, /manager-20261018\.mjs (start|on)\b/);
    assert.doesNotMatch(text, /cli-proxy-api\.exe/);
  }
});

// 2026-10-19: started through the `Astra's PetOS` junction, the manager did nothing, because Node's path for the
// script and import.meta.url (the real path) differed. Claude Opus 5.5 (claude-opus-5-5).
test('the manager runs when started through a junction or with a different letter case', (t) => {
  const dir = mkdtempSync(join(tmpdir(), "damsel-cpa-junction's "));
  try {
    const real = join(dir, 'real folder');
    mkdirSync(real);
    const file = join(real, 'manager.mjs');
    writeFileSync(file, '');
    const url = pathToFileURL(file).href;
    assert.equal(M.isMainScript(file, url), true);
    assert.equal(M.isMainScript(file.toUpperCase(), url), process.platform === 'win32', 'Windows paths ignore case');
    try { symlinkSync(real, join(dir, 'junction'), 'junction'); } catch { t.skip('cannot make a junction here'); return; }
    assert.equal(M.isMainScript(join(dir, 'junction', 'manager.mjs'), url), true, 'a junction path is the same script');
    writeFileSync(join(real, 'other.mjs'), '');
    assert.equal(M.isMainScript(join(dir, 'junction', 'other.mjs'), url), false);
    assert.equal(M.isMainScript(undefined, url), false);
    assert.equal(M.isMainScript(join(dir, 'missing.mjs'), url), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('no personal paths, keys or sign-ins in the tool\'s files', () => {
  for (const f of ['cli-proxy-api-manager-20261018.mjs', 'control-page-20261018.html', 'release-20261019.json', 'README.md']) {
    const text = readFileSync(join(folder, f), 'utf8');
    assert.doesNotMatch(text, /C:\\\\?Users\\\\?[a-z]/i, f);
    assert.doesNotMatch(text, /sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}/, f);
  }
});
