import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { IDLE_MS, isRecentTask, modelLabel, projectLabel, projectDisplayName } from './presence.js';

const PROJECT_REFRESH_MS = 30_000;
let projectCache;

// Older Codex desktop builds keep project names in .codex-global-state.json. That file can hold large
// queued attachments, so keep only the small project maps and reparse it only when it changes
// (checked at most every 30 seconds), never once per chat per poll.
function readProjectState(home, now = Date.now()) {
  const cached = projectCache?.home === home ? projectCache : undefined;
  if (cached && now >= cached.checkedAt && now < cached.nextCheck) return cached.maps;
  let maps = { assignments: new Map(), names: new Map() };
  let signature;
  try {
    const stat = statSync(join(home, '.codex-global-state.json'));
    signature = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    if (cached?.signature === signature) maps = cached.maps;
    else {
      const state = JSON.parse(readFileSync(join(home, '.codex-global-state.json'), 'utf8'));
      for (const [id, assignment] of Object.entries(state?.['thread-project-assignments'] ?? {})) {
        if (typeof assignment?.projectId === 'string') maps.assignments.set(id, assignment.projectId);
      }
      for (const [id, project] of Object.entries(state?.['local-projects'] ?? {})) maps.names.set(id, projectDisplayName(project?.name));
    }
  } catch {
    // A missing or half-written file must not leave old names cached.
    signature = undefined;
    maps = { assignments: new Map(), names: new Map() };
  }
  projectCache = { home, signature, maps, checkedAt: now, nextCheck: now + PROJECT_REFRESH_MS };
  return maps;
}

export function resolveProject(home, thread, getState = () => readProjectState(home)) {
  try {
    const state = getState();
    return state.names.get(state.assignments.get(thread.id) || thread.project_id) || '';
  } catch { return ''; }
}

// Folders Codex makes for itself are not projects: the plain Documents\Codex folder, its dated scratch
// folders (Documents\Codex\2026-10-03\lau) and ChatGPT-project folders under ~\.codex (named by an internal id).
const CODEX_OWN_FOLDERS = [/[\\/]\.codex([\\/]|$)/i, /[\\/]Codex[\\/]\d{4}-\d{2}-\d{2}([\\/]|$)/i, /[\\/]Documents[\\/]Codex$/i];
const stripLongPath = cwd => String(cwd ?? '').replace(/^\\\\\?\\/, '').replace(/[\\/]+$/, '');

// Folder name = the last part of the folder the chat works in (never the full path).
// Codex's own folders and the home folder aren't projects.
export function folderProject(cwd, userHome = homedir()) {
  const path = stripLongPath(cwd);
  if (!path || CODEX_OWN_FOLDERS.some(own => own.test(path))) return '';
  if (path.toLowerCase() === userHome.replace(/[\\/]+$/, '').toLowerCase()) return '';
  return projectDisplayName(path.split(/[\\/]/).pop());
}

// The name to show for one chat, first match wins:
// 1. the chat's own name, when you renamed the chat in Codex (an automatic title made from your first
//    message is never used, because it can contain what you typed);
// 2. the folder the chat works in, if that folder still exists (owner's choice, 2026-10-06: the folder,
//    e.g. "Mommy's 2", rather than the saved project name);
// 3. the Codex project the chat belongs to, for chats in Codex's own scratch folders or a moved folder.
// So renaming a chat in Codex changes the card on the next check, a few seconds later.
export function chatProject(home, row, getState) {
  const chatName = projectLabel(row.chat_name);
  if (chatName) return chatName;
  const path = stripLongPath(row.cwd);
  return (path && existsSync(path) ? folderProject(row.cwd) : '')
    || projectDisplayName(row.project_name) || projectDisplayName(resolveProject(home, row, getState));
}

const PRIMARY = "archived = 0 AND source IN ('vscode', 'cli') AND (agent_path IS NULL OR agent_path = '/root')";

export function detectAstra(home = process.env.CODEX_HOME || join(homedir(), '.codex'), now = Date.now(), shareProject = false) {
  let db;
  let savedState;
  const getProjectState = () => savedState ??= readProjectState(home, now);
  try {
    const files = readdirSync(home).filter(n => /^state_\d+\.sqlite$/.test(n))
      .sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
    if (!files.length) return { active: false, message: 'Codex not found. Use Manual mode for ChatGPT or another app.' };
    db = new DatabaseSync(join(home, files[0]), { readOnly: true });
    db.exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 250;');
    // Columns differ between Codex versions: older ones have no effort, chat name or projects table.
    const columns = new Set(db.prepare('PRAGMA table_info(threads)').all().map(c => c.name));
    const hasProjects = columns.has('project_id')
      && Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'projects'").get());
    const effort = columns.has('reasoning_effort') ? ', t.reasoning_effort' : '';
    const naming = !shareProject ? '' : [columns.has('id') ? 't.id' : 'NULL AS id', columns.has('project_id') ? 't.project_id' : 'NULL AS project_id',
      columns.has('cwd') ? 't.cwd' : 'NULL AS cwd',
      columns.has('name') ? 't.name AS chat_name' : 'NULL AS chat_name', hasProjects ? 'p.name AS project_name' : 'NULL AS project_name']
      .map(c => ', ' + c).join('');
    const from = `FROM threads t${shareProject && hasProjects ? ' LEFT JOIN projects p ON p.id = t.project_id' : ''}`;
    const row = db.prepare(`SELECT t.model, t.updated_at${effort}${naming} ${from}
      WHERE ${PRIMARY.replace(/\b(archived|source|agent_path)\b/g, 't.$1')} ORDER BY t.updated_at DESC LIMIT 1`).get();
    const active = isRecentTask(row, now);
    const model = active ? projectLabel(row.model) : '';
    const level = active ? projectLabel(row.reasoning_effort ?? '') : '';
    let sessions = [];
    if (shareProject && active) {
      // Every chat active in the last five minutes, newest first, each keeping its own model and effort.
      const recent = db.prepare(`SELECT t.model, t.updated_at${effort}${naming} ${from}
        WHERE ${PRIMARY.replace(/\b(archived|source|agent_path)\b/g, 't.$1')} AND t.updated_at >= ?
        ORDER BY t.updated_at DESC LIMIT 25`).all(Math.floor((now - IDLE_MS) / 1000));
      sessions = recent.filter(r => isRecentTask(r, now)).map(r => ({
        project: chatProject(home, r, getProjectState), model: projectLabel(r.model), effort: projectLabel(r.reasoning_effort ?? ''),
      }));
    }
    const project = shareProject && active ? (sessions[0]?.project ?? chatProject(home, row, getProjectState)) : '';
    const projects = [...new Set(sessions.map(session => session.project).filter(Boolean))];
    return { active, model, effort: level, project, projects, sessions, message: active ? `Recent ${modelLabel(model)} activity detected in Codex.` : 'Waiting for recent activity in Codex.' };
  } catch {
    return { active: false, message: 'Automatic detection unavailable. Manual mode still works.' };
  } finally { db?.close(); }
}
