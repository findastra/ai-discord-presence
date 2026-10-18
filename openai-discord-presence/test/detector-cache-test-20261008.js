import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { detectAstra } from '../src/detector.js';

test('saved project lookups read once per poll and throttle changed state while retaining live models', () => {
  const dir = fs.mkdtempSync(join(tmpdir(), 'astra-cache-20261008-'));
  const statePath = join(dir, '.codex-global-state.json');
  const db = new DatabaseSync(join(dir, 'state_5.sqlite'));
  db.exec('CREATE TABLE threads(model TEXT, reasoning_effort TEXT, updated_at INTEGER, archived INTEGER, source TEXT, agent_path TEXT, cwd TEXT, id TEXT, project_id TEXT)');
  const add = db.prepare('INSERT INTO threads VALUES (?, ?, ?, 0, ?, NULL, ?, ?, ?)');
  add.run('gpt-6-astra', 'ultra', 999, 'vscode', '', 'first', 'old');
  add.run('gpt-6-sol', 'low', 998, 'vscode', '', 'second', 'saved');
  add.run('gpt-6-luna', 'medium', 997, 'vscode', '', 'third', 'saved');
  const save = name => fs.writeFileSync(statePath, JSON.stringify({
    'thread-project-assignments': { first: { projectId: 'saved' } },
    'local-projects': { old: { name: 'Superseded' }, saved: { name } },
    'queued-follow-ups': { pending: 'unrelated attachment data'.repeat(1000) },
  }));
  save('Saved project');
  let clock = 1_000_000;
  let reads = 0;
  const realRead = fs.readFileSync;
  const readMock = mock.method(fs, 'readFileSync', function(path, ...args) {
    if (path === statePath) reads++;
    return realRead.call(this, path, ...args);
  });
  const clockMock = mock.method(Date, 'now', () => clock);
  syncBuiltinESMExports();
  const detect = () => detectAstra(dir, clock, true); // the poll passes its time, as the server does
  try {
    const first = detect();
    assert.equal(reads, 1, 'the newest chat and all rotating chats share one state read');
    assert.deepEqual(first.sessions, [
      { project: 'Saved project', model: 'gpt-6-astra', effort: 'ultra' },
      { project: 'Saved project', model: 'gpt-6-sol', effort: 'low' },
      { project: 'Saved project', model: 'gpt-6-luna', effort: 'medium' },
    ]);
    save('Renamed saved project');
    db.exec("UPDATE threads SET model = 'gpt-6-sol', reasoning_effort = 'high' WHERE id = 'first'");
    clock += 5_000;
    const duringCooldown = detect();
    assert.equal(reads, 1, 'a rewritten attachment-heavy file is not reloaded after five seconds');
    assert.equal(duringCooldown.project, 'Saved project');
    assert.equal(duringCooldown.model, 'gpt-6-sol', 'model detection remains live during the project-cache cooldown');
    assert.equal(duringCooldown.effort, 'high');
    clock += 25_000;
    assert.equal(detect().project, 'Renamed saved project');
    assert.equal(reads, 2, 'changed project names refresh at thirty seconds');
    clock += 30_000;
    assert.equal(detect().project, 'Renamed saved project');
    assert.equal(reads, 2, 'unchanged file metadata does not trigger another read');
    fs.writeFileSync(statePath, '{incomplete');
    clock += 30_000;
    assert.equal(detect().project, '', 'an incomplete refresh clears stale saved names');
    assert.equal(reads, 3);
    save('Recovered project');
    clock += 30_000;
    assert.equal(detect().project, 'Recovered project');
    assert.equal(reads, 4, 'a valid file is retried after an incomplete write');
    fs.unlinkSync(statePath);
    clock += 30_000;
    assert.equal(detect().project, '', 'removal clears the cached name');
    assert.equal(reads, 4, 'missing state is handled without a failed full read');
  } finally {
    readMock.mock.restore();
    clockMock.mock.restore();
    syncBuiltinESMExports();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('disabled sharing and existing project folders never read saved app state', () => {
  const dir = fs.mkdtempSync(join(tmpdir(), 'astra-folder-cache-20261008-'));
  const folder = join(dir, 'current-project');
  fs.mkdirSync(folder);
  const statePath = join(dir, '.codex-global-state.json');
  fs.writeFileSync(statePath, JSON.stringify({ 'local-projects': { saved: { name: 'Old saved project' } } }));
  const db = new DatabaseSync(join(dir, 'state_5.sqlite'));
  db.exec('CREATE TABLE threads(model TEXT, updated_at INTEGER, archived INTEGER, source TEXT, agent_path TEXT, cwd TEXT, id TEXT, project_id TEXT)');
  db.prepare('INSERT INTO threads VALUES (?, 999, 0, ?, NULL, ?, ?, ?)')
    .run('gpt-6-astra', 'vscode', folder, 'task', 'saved');
  let reads = 0;
  const realRead = fs.readFileSync;
  const readMock = mock.method(fs, 'readFileSync', function(path, ...args) {
    if (path === statePath) reads++;
    return realRead.call(this, path, ...args);
  });
  syncBuiltinESMExports();
  try {
    assert.equal(detectAstra(dir, 1_000_000, false).project, '');
    assert.equal(detectAstra(dir, 1_000_000, true).project, 'current-project');
    assert.equal(reads, 0);
    db.prepare('UPDATE threads SET cwd = ?').run(join(dir, 'renamed-folder'));
    assert.equal(detectAstra(dir, 1_000_000, true).project, 'Old saved project');
    assert.equal(reads, 1, 'a missing folder still uses the saved name');
  } finally {
    readMock.mock.restore();
    syncBuiltinESMExports();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
