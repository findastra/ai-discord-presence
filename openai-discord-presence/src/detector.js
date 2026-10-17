import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { IDLE_MS, isRecentTask, modelLabel, projectLabel, projectDisplayName } from './presence.js';

const PROJECT_REFRESH_MS = 30_000;
let projectCache;

// Codex state can contain large queued attachments. Keep only the small project maps,
// and do not reparse the whole file for every chat or every five-second presence poll.
function readProjectState(home) {
  const now = Date.now();
  const cached = projectCache?.home === home ? projectCache : undefined;
  if (cached && now >= cached.checkedAt && now < cached.nextCheck) return cached.maps;
  let maps = { assignments: new Map(), names: new Map() };
  let signature;
  try {
    const path = join(home, '.codex-global-state.json');
    const stat = statSync(path);
    signature = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    if (cached?.signature === signature) maps = cached.maps;
    else {
      const state = JSON.parse(readFileSync(path, 'utf8'));
      for (const [id, assignment] of Object.entries(state?.['thread-project-assignments'] ?? {})) {
        if (typeof assignment?.projectId === 'string') maps.assignments.set(id, assignment.projectId);
      }
      for (const [id, project] of Object.entries(state?.['local-projects'] ?? {})) {
        maps.names.set(id, projectDisplayName(project?.name));
      }
    }
  } catch {
    // A missing or incomplete state file must not leave stale labels cached forever.
    signature = undefined;
    maps = { assignments: new Map(), names: new Map() };
  }
  projectCache = { home, signature, maps, checkedAt: now, nextCheck: now + PROJECT_REFRESH_MS };
  return maps;
}

export function resolveProject(home, thread, getState = () => readProjectState(home)) {
  try {
    const state = getState();
    const assigned = state.assignments.get(thread.id);
    return state.names.get(assigned || thread.project_id) || '';
  } catch { return ''; }
}

// Folders Codex makes for itself are not projects: the plain Documents\Codex folder, its dated scratch
// folders (Documents\Codex\2026-10-03\lau) and ChatGPT-project folders under ~\.codex (named by an internal id).
const CODEX_OWN_FOLDERS = [/[\\/]\.codex([\\/]|$)/i, /[\\/]Codex[\\/]\d{4}-\d{2}-\d{2}([\\/]|$)/i, /[\\/]Documents[\\/]Codex$/i];
const stripLongPath = cwd => String(cwd ?? '').replace(/^\\\\\?\\/, '').replace(/[\\/]+$/, '');

// Project name = the folder the chat works in (its last path part, never the full path).
// Codex's own folders and the home folder aren't projects; those chats fall back to their saved Codex project name.
export function folderProject(cwd, userHome = homedir()) {
  const path = stripLongPath(cwd);
  if (!path || CODEX_OWN_FOLDERS.some(own => own.test(path))) return '';
  if (path.toLowerCase() === userHome.replace(/[\\/]+$/, '').toLowerCase()) return '';
  return projectDisplayName(path.split(/[\\/]/).pop());
}

// The project to show for one chat: its folder if that folder still exists (a renamed or deleted folder
// would show a name that no longer exists), otherwise the chat's saved Codex project name.
export function chatProject(home, row, getState) {
  const path = stripLongPath(row.cwd);
  return (path && existsSync(path) ? folderProject(row.cwd) : '') || resolveProject(home, row, getState);
}

export function detectAstra(home = process.env.CODEX_HOME || join(homedir(), '.codex'), now = Date.now(), shareProject = false) {
  let db;
  let savedState;
  const getProjectState = () => savedState ??= readProjectState(home);
  try {
    const files = readdirSync(home).filter(n => /^state_\d+\.sqlite$/.test(n))
      .sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
    if (!files.length) return { active: false, message: 'Codex not found. Use Manual mode for ChatGPT or another app.' };
    db = new DatabaseSync(join(home, files[0]), { readOnly: true });
    db.exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 250;');
    // Older Codex versions have no effort column; they still get a card, just without the level.
    const hasEffort = db.prepare('PRAGMA table_info(threads)').all().some(c => c.name === 'reasoning_effort');
    const row = db.prepare(`SELECT model, updated_at${hasEffort ? ', reasoning_effort' : ''}${shareProject ? ', id, project_id, cwd' : ''} FROM threads
      WHERE archived = 0 AND source IN ('vscode', 'cli')
      AND (agent_path IS NULL OR agent_path = '/root')
      ORDER BY updated_at DESC LIMIT 1`).get();
    const active = isRecentTask(row, now);
    const model = active ? projectLabel(row.model) : '';
    const effort = active ? projectLabel(row.reasoning_effort ?? '') : '';
    const project = shareProject && active ? chatProject(home, row, getProjectState) : '';
    // Keep each chat's model and effort with its project when rotating the card.
    let sessions = [];
    if (shareProject && active) {
      const recent = db.prepare(`SELECT id, project_id, cwd, model, updated_at${hasEffort ? ', reasoning_effort' : ''} FROM threads
        WHERE archived = 0 AND source IN ('vscode', 'cli') AND (agent_path IS NULL OR agent_path = '/root')
        AND updated_at >= ? ORDER BY updated_at DESC LIMIT 25`).all(Math.floor((now - IDLE_MS) / 1000));
      sessions = recent.filter(r => isRecentTask(r, now)).map(r => ({
        project: chatProject(home, r, getProjectState), model: projectLabel(r.model), effort: projectLabel(r.reasoning_effort ?? ''),
      }));
    }
    const projects = [...new Set(sessions.map(session => session.project).filter(Boolean))];
    return { active, model, effort, project, projects, sessions, message: active ? `Recent ${modelLabel(model)} activity detected in Codex.` : 'Waiting for recent activity in Codex.' };
  } catch {
    return { active: false, message: 'Automatic detection unavailable. Manual mode still works.' };
  } finally { db?.close(); }
}
