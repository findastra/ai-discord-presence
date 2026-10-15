import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { BUILT_IN_CLIENT_ID, GALAXY_URL, Presence, activity, validateConfig, modelLabel, effortLabel, selectSession, rotationCards, ROTATE_MS } from './presence.js';
import { detectAstra } from './detector.js';
import { DiscordRPC } from './rpc.js';
import { startupEnabled, setStartup } from './windows-startup.js';
import { SOURCE_IDENTITY } from './source-identity-20261008.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, '.local', 'config.json');
const port = Number(process.env.OPENAI_PRESENCE_PORT || 38761);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid OPENAI_PRESENCE_PORT.');
const origin = `http://127.0.0.1:${port}`;
let config = { clientId: BUILT_IN_CLIENT_ID, image: GALAXY_URL };
try { config = validateConfig(JSON.parse(readFileSync(configPath, 'utf8'))); } catch { /* Setup stays available. */ }
const presence = new Presence();
if (config.automaticOnStart) presence.setMode('auto');
const rpc = new DiscordRPC();
let detection = { active: false, model: '', message: 'Choose Automatic to detect recent Codex activity.' };
let currentSession = selectSession(detection, config);
let message = config.clientId ? 'Ready. Choose how to share.' : 'One-time setup: add your Discord Application ID.';
let published = false;
let lastSent;
let revision = 0;
let running = false;
let rerun = false;
let closing = false;
// The card is checked every second so each project gets its turn on time; the detector itself reads
// Codex/Claude Code metadata at most every 3 seconds, and Discord only hears about real changes.
const TICK_MS = 1000;
const DETECT_MS = 3000;
let detectedAt = 0;
// After a failed connection (Discord closed), wait before trying the pipes again.
let retryAt = 0;
rpc.on('disconnected', () => { published = false; lastSent = undefined; });

async function sync() {
  if (closing) return;
  if (running) { rerun = true; return; }
  running = true;
  const current = revision;
  try {
    // Manual mode also checks, so the card can name the exact model and project.
    if (presence.mode !== 'off' && Date.now() - detectedAt >= DETECT_MS) {
      detection = detectAstra(undefined, Date.now(), config.shareProject);
      detectedAt = Date.now();
    }
    presence.update(detection.active);
    currentSession = selectSession(detection, config);
    if (!config.clientId) { message = 'Add your Discord Application ID to connect.'; return; }
    if (presence.startedAt === null) {
      if (rpc.ready && lastSent !== null) await rpc.setActivity(null);
      published = false;
      lastSent = null;
      rpc.disconnect();
      message = presence.mode === 'off' ? 'Sharing is off.' : detection.message;
      return;
    }
    if (!rpc.ready && Date.now() < retryAt) return;
    await rpc.connect(config.clientId);
    retryAt = 0;
    if (current !== revision || closing) { rerun = true; return; }
    const payload = activity(presence.startedAt, config.image, currentSession.project, currentSession.model, currentSession.effort);
    const signature = JSON.stringify(payload);
    if (lastSent !== signature) {
      await rpc.setActivity(payload);
      lastSent = signature;
    }
    published = true;
    message = 'Activity accepted by Discord. Your settings and Discord client control its visibility; only one card may appear.';
  } catch (error) {
    published = false;
    message = error.message;
    if (!rpc.ready) retryAt = Date.now() + 5000;
  } finally {
    running = false;
    if (rerun && !closing) { rerun = false; setImmediate(sync); }
  }
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function jsonBody(req) {
  if (req.headers['content-type'] !== 'application/json') throw new Error('Expected JSON.');
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) throw new Error('Request too large.');
  }
  return JSON.parse(body);
}

const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/galaxy.png': ['galaxy.png', 'image/png'],
  '/galaxy.gif': ['galaxy.gif', 'image/gif'],
};

const server = http.createServer(async (req, res) => {
  // Exact Host and Origin checks prevent DNS rebinding and cross-site control.
  if (req.headers.host !== `127.0.0.1:${port}`) return send(res, 403, { error: 'Local requests only.' });
  try {
    if (req.method === 'GET' && req.url === '/api/status') {
      return send(res, 200, { app: 'openai-discord-presence', identity: SOURCE_IDENTITY, config, mode: presence.mode, startedAt: presence.startedAt, published,
        connected: rpc.ready, message, startupEnabled: startupEnabled(), project: currentSession.project, model: currentSession.model, effortLabel: modelLabel(currentSession.model) ? effortLabel(currentSession.effort) : '', modelLabel: modelLabel(currentSession.model) || 'OpenAI', detection: detection.message,
        projects: config.shareProject && !config.projectName ? [...new Set(rotationCards(detection.sessions ?? []).map(s => s.project).filter(Boolean))] : [],
        rotateSeconds: ROTATE_MS / 1000 });
    }
    if (req.method === 'POST') {
      if (req.headers.origin !== origin) return send(res, 403, { error: 'Open the local control panel to make changes.' });
      const input = await jsonBody(req);
      if (req.url === '/api/startup') {
        if (typeof input.enabled !== 'boolean') throw new Error('Choose whether to run on startup.');
        config = setStartup(input.enabled);
        return send(res, 200, { ok: true });
      }
      if (req.url === '/api/config') {
        const nextConfig = validateConfig(input);
        mkdirSync(join(root, '.local'), { recursive: true });
        writeFileSync(configPath, JSON.stringify(nextConfig, null, 2) + '\n', { mode: 0o600 });
        config = nextConfig;
        revision++;
        detectedAt = 0;
        retryAt = 0;
        rpc.disconnect();
        void sync();
        return send(res, 200, { ok: true });
      }
      if (req.url === '/api/mode') {
        presence.setMode(input.mode);
        revision++;
        detectedAt = 0;
        retryAt = 0;
        if (input.mode === 'off') rpc.disconnect();
        void sync();
        return send(res, 200, { ok: true });
      }
      if (req.url === '/api/quit') {
        send(res, 200, { ok: true });
        void shutdown();
        return;
      }
    }
    if (req.method === 'GET' && assets[req.url]) {
      const [file, type] = assets[req.url];
      return send(res, 200, readFileSync(join(root, 'public', file)), type);
    }
    send(res, 404, { error: 'Not found.' });
  } catch (error) { send(res, 400, { error: error instanceof SyntaxError ? 'Invalid JSON.' : error.message }); }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `OpenAI Discord Presence may already be running. Open ${origin}` : error.message);
  clearInterval(interval);
  rpc.disconnect();
  process.exitCode = 1;
});
const interval = setInterval(sync, TICK_MS);
async function shutdown() {
  if (closing) return;
  closing = true;
  clearInterval(interval);
  presence.setMode('off');
  try { if (rpc.ready) await rpc.setActivity(null); } catch { /* Closing IPC also removes presence. */ }
  rpc.disconnect();
  server.close();
  server.closeAllConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Windows: show a system tray icon with Start, Automatic, Stop, Open and Quit.
function startTray() {
  if (process.platform !== 'win32' || process.env.OPENAI_PRESENCE_NO_TRAY) return;
  try {
    const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
      '-File', join(root, 'scripts', 'tray-20261009.ps1'), '-Port', String(port), '-Name', 'OpenAI Discord Presence',
      '-Icon', join(root, 'public', 'tray-icon-20261009.ico'), '-ServerPid', String(process.pid)],
      { detached: true, windowsHide: true, stdio: 'ignore' });
    child.on('error', () => { /* The control panel still works without a tray icon. */ });
    child.unref();
  } catch { /* The control panel still works without a tray icon. */ }
}
server.listen(port, '127.0.0.1', () => {
  console.log(`OpenAI Discord Presence: ${origin}\nClose with Quit app or Ctrl+C.`);
  void sync();
  startTray();
});
