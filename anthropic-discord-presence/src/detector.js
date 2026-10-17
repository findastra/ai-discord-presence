import { existsSync, readdirSync, statSync, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { IDLE_MS, modelLabel, projectLabel, projectDisplayName } from './presence.js';

// Newest Claude Code transcript as { file, mtimeMs }, or { file: '', mtimeMs: 0 }. Reads file metadata only.
export function latestClaudeCode(home = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')) {
  let latest = { file: '', mtimeMs: 0 };
  try {
    const projects = join(home, 'projects');
    for (const dir of readdirSync(projects, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const name of readdirSync(join(projects, dir.name))) {
        if (!name.endsWith('.jsonl')) continue;
        const file = join(projects, dir.name, name);
        try { const { mtimeMs } = statSync(file); if (mtimeMs > latest.mtimeMs) latest = { file, mtimeMs }; } catch { /* File rotated. */ }
      }
    }
  } catch { /* Claude Code not installed. */ }
  return latest;
}

const transcriptCache = new Map();
const MAX_CACHED_TRANSCRIPTS = 64;
const MAX_RECORD_BYTES = 8 * 1024 * 1024;
const EFFORTS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
const emptyInfo = () => ({ model: '', effort: '', cwd: '', activity: null });
const fileSignature = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
const validModel = value => typeof value === 'string' && /^claude-[\w.\[\]-]{1,60}$/.test(value) ? value : '';
const validCwd = value => typeof value === 'string' && value.length <= 4096 ? value : '';
const validEffort = row => EFFORTS.has(row.perTurnEffort ?? row.effort) ? row.perTurnEffort ?? row.effort : '';

// Bookkeeping, tool results, synthetic replies, and an open app are not evidence of use.
// A new human input is active but has no confirmed model until its assistant reply arrives.
function conversationActivity(row) {
  if (row.isMeta === true || row.isSidechain === true || row.isApiErrorMessage === true) return null;
  const at = typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : NaN;
  if (!Number.isFinite(at) || at <= 0) return null;
  const message = row.message;
  if (!message || typeof message !== 'object') return null;
  if (row.type === 'assistant' && message.role === 'assistant') {
    if (typeof message.model !== 'string' || !message.model || message.model === '<synthetic>') return null;
    const model = validModel(message.model);
    return { at, model, effort: model ? validEffort(row) : '', cwd: validCwd(row.cwd) };
  }
  if (row.type !== 'user' || message.role !== 'user' || (row.turnOrigin && row.turnOrigin !== 'human')) return null;
  const content = message.content;
  const humanInput = typeof content === 'string' ? content.trim().length > 0 : Array.isArray(content)
    && content.some(block => block && ((block.type === 'text' && typeof block.text === 'string' && block.text.trim())
      || block.type === 'image' || block.type === 'document'));
  return humanInput ? { at, model: '', effort: '', cwd: validCwd(row.cwd) } : null;
}

// Read complete records backward, including records larger than one read buffer. Fragments are
// joined only once per record, so large tool results cannot hide or corrupt earlier metadata.
function* reverseRecords(fd, size) {
  let position = size;
  let pieces = [];
  let recordBytes = 0;
  const add = piece => {
    recordBytes += piece.length;
    if (recordBytes > MAX_RECORD_BYTES) throw new Error('Transcript record exceeds the metadata read limit.');
    pieces.push(piece);
  };
  while (position > 0) {
    const chunk = Buffer.alloc(Math.min(position, 64 * 1024));
    position -= chunk.length;
    if (readSync(fd, chunk, 0, chunk.length, position) !== chunk.length) throw new Error('Transcript changed while reading.');
    let end = chunk.length;
    for (let i = chunk.length - 1; i >= 0; i--) {
      if (chunk[i] !== 10) continue;
      if (end > i + 1) add(chunk.subarray(i + 1, end));
      if (pieces.length) yield Buffer.concat(pieces.reverse()).toString('utf8');
      pieces = [];
      recordBytes = 0;
      end = i;
    }
    if (end) add(chunk.subarray(0, end));
  }
  if (pieces.length) yield Buffer.concat(pieces.reverse()).toString('utf8');
}

// Only metadata is cached, never conversation text. File identity and modification metadata
// invalidate the bounded cache on appends, truncation, replacement, or rewrites.
function transcriptMetadata(file, requireActivity = false) {
  let fd;
  try {
    fd = openSync(file, 'r');
    const stat = fstatSync(fd);
    const signature = fileSignature(stat);
    const cached = transcriptCache.get(file);
    if (cached?.signature === signature && (!requireActivity || cached.activityRead)) {
      transcriptCache.delete(file);
      transcriptCache.set(file, cached);
      return { ...cached.info };
    }
    const info = emptyInfo();
    let modelFound = false;
    let cwdFound = false;
    for (const line of reverseRecords(fd, stat.size)) {
      let row;
      try { row = JSON.parse(line); } catch { continue; } // Ignore incomplete writes and malformed records.
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      info.activity ??= conversationActivity(row);
      if (!cwdFound && typeof row.cwd === 'string') {
        info.cwd = validCwd(row.cwd);
        cwdFound = true;
      }
      if (!modelFound && row.type === 'assistant' && row.message && typeof row.message === 'object'
        && row.message.model !== '<synthetic>') {
        info.model = validModel(row.message.model);
        info.effort = info.model ? validEffort(row) : '';
        modelFound = true;
      }
      if (modelFound && cwdFound && (!requireActivity || info.activity)) break;
    }
    if (fileSignature(fstatSync(fd)) !== signature) return emptyInfo();
    transcriptCache.delete(file);
    transcriptCache.set(file, { signature, info, activityRead: requireActivity || Boolean(info.activity) });
    if (transcriptCache.size > MAX_CACHED_TRANSCRIPTS) transcriptCache.delete(transcriptCache.keys().next().value);
    return { ...info };
  } catch {
    transcriptCache.delete(file);
    return emptyInfo();
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function transcriptInfo(file) {
  const { model, effort, cwd } = transcriptMetadata(file);
  return { model, effort, cwd };
}

export function transcriptModel(file) {
  return transcriptInfo(file).model;
}

// Project name = the folder the session works in (its last path part, never the full path).
// "No folder" sessions run in the desktop app's scratch workspace and the home folder isn't a project.
export function folderProject(cwd, home = homedir()) {
  const path = String(cwd ?? '').replace(/^\\\\\?\\/, '').replace(/[\\/]+$/, '');
  if (!path || /[\\/]Claude[\\/]scratch-workspaces[\\/]/i.test(path)) return '';
  if (path.toLowerCase() === home.replace(/[\\/]+$/, '').toLowerCase()) return '';
  return projectDisplayName(path.split(/[\\/]/).pop());
}

// Session names set with /rename in Claude Code. Claude Code appends a small record
// {"type":"custom-title","customTitle":"…"} to the transcript; the newest one is the current name.
// Only those records are parsed: other lines are skipped unless they contain that marker, and a
// message that merely mentions it is ignored because its type is not custom-title. Automatic titles
// (made from what you typed) are never used. Each transcript is read once, then only the bytes
// appended since the last check.
const nameCache = new Map();
const MAX_NAME_CACHE = 256;
const NAME_CHUNK = 1024 * 1024;
const NAME_MARKER = '"custom-title"';

export function sessionName(file) {
  let fd;
  try {
    fd = openSync(file, 'r');
    const stat = fstatSync(fd);
    const id = `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
    let entry = nameCache.get(file);
    if (!entry || entry.id !== id || stat.size < entry.offset) entry = { id, offset: 0, name: '' };
    let position = entry.offset;
    let carry = Buffer.alloc(0);
    let skipping = false;
    while (position < stat.size) {
      const chunk = Buffer.alloc(Math.min(NAME_CHUNK, stat.size - position));
      const read = readSync(fd, chunk, 0, chunk.length, position);
      if (!read) break;
      position += read;
      let data = carry.length ? Buffer.concat([carry, chunk.subarray(0, read)]) : chunk.subarray(0, read);
      carry = Buffer.alloc(0);
      if (skipping) {
        const next = data.indexOf(10);
        if (next === -1) continue;
        data = data.subarray(next + 1);
        skipping = false;
      }
      const last = data.lastIndexOf(10);
      if (last === -1) {
        // One very large record (a big tool result): skip it rather than hold it in memory.
        if (data.length > MAX_RECORD_BYTES) skipping = true; else carry = Buffer.from(data);
        continue;
      }
      const complete = data.subarray(0, last);
      carry = Buffer.from(data.subarray(last + 1));
      if (!complete.includes(NAME_MARKER)) continue;
      for (const line of complete.toString('utf8').split('\n')) {
        if (!line.includes(NAME_MARKER)) continue;
        try {
          const row = JSON.parse(line);
          if (row?.type === 'custom-title' && typeof row.customTitle === 'string') entry.name = projectLabel(row.customTitle);
        } catch { /* Incomplete or unrelated line. */ }
      }
    }
    entry.offset = position - carry.length;
    nameCache.delete(file);
    nameCache.set(file, entry);
    if (nameCache.size > MAX_NAME_CACHE) nameCache.delete(nameCache.keys().next().value);
    return entry.name;
  } catch {
    nameCache.delete(file);
    return '';
  } finally { if (fd !== undefined) closeSync(fd); }
}

// The project to show for one session: its folder, but only if that folder still exists (a moved or
// deleted folder would show a name that no longer exists).
export function sessionProject(cwd) {
  return cwd && existsSync(cwd) ? folderProject(cwd) : '';
}

// File modification times only narrow the scan; actual event timestamps decide activity below.
export function recentClaudeCode(home = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), now = Date.now()) {
  const found = [];
  try {
    const projects = join(home, 'projects');
    for (const dir of readdirSync(projects, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const name of readdirSync(join(projects, dir.name))) {
        if (!name.endsWith('.jsonl')) continue;
        const file = join(projects, dir.name, name);
        try { const { mtimeMs } = statSync(file); if (isRecent(mtimeMs, now)) found.push({ file, mtimeMs }); } catch { /* File rotated. */ }
      }
    }
  } catch { /* Claude Code not installed. */ }
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export function isRecent(mtimeMs, now = Date.now()) {
  const age = now - mtimeMs;
  return mtimeMs > 0 && age >= -5000 && age < IDLE_MS;
}

// The name to show for one session, first match wins: its /rename name, then its folder if that
// folder still exists. Renaming a session changes the card on the next check.
export function sessionLabel(file, cwd, names = true) {
  return (names ? sessionName(file) : '') || sessionProject(cwd);
}

export async function detectClaude({ now = Date.now(), home, names = true } = {}) {
  try {
    const recent = recentClaudeCode(home, now);
    const active = recent.map(({ file }) => ({ file, event: transcriptMetadata(file, true).activity }))
      .filter(({ event }) => event && isRecent(event.at, now)).sort((a, b) => b.event.at - a.event.at);
    if (active.length) {
      const sessions = [];
      const seen = new Set();
      for (const { file, event: { model, effort, cwd } } of active) {
        const session = { project: sessionLabel(file, cwd, names), model, effort };
        const key = JSON.stringify(session);
        if (!seen.has(key)) { seen.add(key); sessions.push(session); }
      }
      const { project, model, effort } = sessions[0];
      const projects = [...new Set(sessions.map(session => session.project).filter(Boolean))];
      return { active: true, model, effort, project, projects, sessions, message: `Recent ${modelLabel(model) || 'Claude Code'} activity detected.` };
    }
    return { active: false, model: '', effort: '', project: '', message: 'Waiting for recent Claude conversation activity.' };
  } catch {
    return { active: false, model: '', effort: '', project: '', message: 'Automatic detection unavailable. Manual mode still works.' };
  }
}
