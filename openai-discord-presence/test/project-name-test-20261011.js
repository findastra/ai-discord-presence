import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { projectDisplayName, selectSession, activity, rotationCards, ROTATE_MS } from '../src/presence.js';
import { folderProject, detectAstra } from '../src/detector.js';

test('old Pet Apps folder names fall back to the official project name', () => {
  for (const old of ['Findastra Pet Apps', 'findastra-pet-apps', 'astras-pet-os']) {
    const project = folderProject('C:/example/' + old);
    assert.equal(project, "Astra's PetOS");
    assert.equal(activity(100, undefined, project, 'gpt-6-astra').state, "Working on Astra's PetOS");
  }
  assert.equal(projectDisplayName('Other Findastra Pet Apps notes'), 'Other Findastra Pet Apps notes');
  assert.equal(projectDisplayName('Paper Girl'), 'Paper Girl');
});

test('a fixed project name is shown exactly as typed, and sharing stays opt-in', () => {
  const detection = { sessions: [{ project: "Astra's PetOS" }, { project: 'Paper Girl' }] };
  assert.equal(selectSession(detection, { shareProject: true }, 0).project, "Astra's PetOS");
  assert.equal(selectSession(detection, { shareProject: true }, ROTATE_MS).project, 'Paper Girl');
  assert.equal(selectSession(detection, { shareProject: false }, 0).project, '');
  assert.equal(selectSession(detection, { shareProject: true, projectName: 'findastra-pet-apps' }, 0).project, 'findastra-pet-apps');
});

test('renaming the chat in Codex changes the card on the next check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-rename-'));
  try {
    const folder = join(dir, 'Findastra Pet Apps'); mkdirSync(folder);
    const db = new DatabaseSync(join(dir, 'state_9.sqlite'));
    db.exec(`CREATE TABLE projects(id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE threads(id TEXT, model TEXT, updated_at INTEGER, archived INTEGER, source TEXT, agent_path TEXT,
        cwd TEXT, project_id TEXT, title TEXT, name TEXT, first_user_message TEXT)`);
    db.prepare("INSERT INTO threads VALUES ('t1', 'gpt-6-astra', 999, 0, 'vscode', NULL, ?, NULL, 'please fix my secret bug', NULL, 'please fix my secret bug')").run(folder);
    // Folder only: the old folder name falls back to the official name. The automatic title is never used.
    assert.equal(detectAstra(dir, 1_000_000, true).project, "Astra's PetOS");
    // The folder still beats a saved Codex project name (owner's choice, 2026-10-06).
    db.exec("INSERT INTO projects VALUES ('p1', 'Pet Programs'); UPDATE threads SET project_id = 'p1'");
    assert.equal(detectAstra(dir, 1_000_000, true).project, "Astra's PetOS");
    // Renaming the chat beats both, exactly as written.
    db.exec("UPDATE threads SET name = 'Galaxy Cards'");
    assert.equal(detectAstra(dir, 1_000_000, true).project, 'Galaxy Cards');
    db.exec("UPDATE threads SET name = '  Pet   Apps\nv2 '");
    assert.equal(detectAstra(dir, 1_000_000, true).project, 'Pet Apps v2');
    // Clearing the chat name falls back again; a chat in Codex's own scratch folder uses the project name
    // from the database; sharing off never reads names.
    db.exec("UPDATE threads SET name = ''");
    assert.equal(detectAstra(dir, 1_000_000, true).project, "Astra's PetOS");
    db.prepare("UPDATE threads SET cwd = ?").run('C:\\Users\\me\\Documents\\Codex\\2026-10-14\\abc');
    assert.equal(detectAstra(dir, 1_000_000, true).project, 'Pet Programs');
    assert.equal(detectAstra(dir, 1_000_000, false).project, '');
    db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('rotation gives every project one turn, every 6 seconds or faster', () => {
  assert.ok(ROTATE_MS <= 6000 && ROTATE_MS >= 4000, 'stay inside Discord\'s five updates per 20 seconds');
  const sessions = [
    { project: 'paper-girl', model: 'gpt-6-astra', effort: 'high' },
    { project: 'paper-girl', model: 'gpt-6-astra', effort: 'high' },
    { project: '', model: 'gpt-6-astra', effort: 'high' },
    { project: 'fuzzbois', model: 'gpt-6-sol', effort: 'low' },
    { project: 'paper-girl', model: 'gpt-6-astra', effort: 'high' },
    { project: "Astra's PetOS", model: 'gpt-6-astra', effort: 'ultra' },
  ];
  assert.deepEqual(rotationCards(sessions).map(card => card.project), ['paper-girl', 'fuzzbois', "Astra's PetOS"]);
  const shown = [0, 1, 2, 3].map(i => selectSession({ sessions }, { shareProject: true }, i * ROTATE_MS).project);
  assert.deepEqual(shown, ['paper-girl', 'fuzzbois', "Astra's PetOS", 'paper-girl']);
  // No named project at all: the newest chat still shows, as "Exploring ideas".
  assert.deepEqual(rotationCards([{ project: '', model: 'gpt-6-astra' }, { project: '', model: 'gpt-6-sol' }]).length, 1);
});

test('older Codex databases without names or a projects table still work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-old-'));
  try {
    const db = new DatabaseSync(join(dir, 'state_5.sqlite'));
    db.exec('CREATE TABLE threads(model TEXT, updated_at INTEGER, archived INTEGER, source TEXT, agent_path TEXT, cwd TEXT, id TEXT)');
    mkdirSync(join(dir, 'paper-girl'));
    db.prepare("INSERT INTO threads VALUES ('gpt-6-astra', 999, 0, 'vscode', NULL, ?, 't')").run(join(dir, 'paper-girl'));
    db.close();
    const found = detectAstra(dir, 1_000_000, true);
    assert.equal(found.active, true);
    assert.equal(found.project, 'paper-girl');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the saved-project state file is not reparsed on every check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-cache-'));
  try {
    const db = new DatabaseSync(join(dir, 'state_5.sqlite'));
    db.exec('CREATE TABLE threads(model TEXT, updated_at INTEGER, archived INTEGER, source TEXT, agent_path TEXT, cwd TEXT, id TEXT, project_id TEXT)');
    db.prepare("INSERT INTO threads VALUES ('gpt-6-astra', 999, 0, 'vscode', NULL, NULL, 't', 'p')").run();
    db.close();
    writeFileSync(join(dir, '.codex-global-state.json'), JSON.stringify({ 'local-projects': { p: { name: 'First' } } }));
    assert.equal(detectAstra(dir, 1_000_000, true).project, 'First');
    // Inside the 30-second window the cached name is used; after it, the change is picked up.
    writeFileSync(join(dir, '.codex-global-state.json'), JSON.stringify({ 'local-projects': { p: { name: 'Second name' } } }));
    assert.equal(detectAstra(dir, 1_010_000, true).project, 'First');
    assert.equal(detectAstra(dir, 1_031_000, true).project, 'Second name');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
