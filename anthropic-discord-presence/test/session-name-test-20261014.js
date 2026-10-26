import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectClaude, sessionName, folderProject } from '../src/detector.js';
import { selectSession, rotationCards, ROTATE_MS, activity } from '../src/presence.js';

const reply = (cwd, at, model = 'claude-opus-5-5') => JSON.stringify({ type: 'assistant', timestamp: new Date(at).toISOString(), cwd,
  effort: 'high', message: { role: 'assistant', model } }) + '\n';
const rename = name => JSON.stringify({ type: 'custom-title', customTitle: name, sessionId: 's' }) + '\n';

test('a /rename name wins over the folder and updates on the next check', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-rename-'));
  try {
    mkdirSync(join(dir, 'projects', 'a'), { recursive: true });
    const folder = join(dir, 'astras-pet-os'); mkdirSync(folder);
    const file = join(dir, 'projects', 'a', 'session-20261014.jsonl');
    const now = Date.now();
    writeFileSync(file, reply(folder, now - 2000));
    // Folder only: the old folder slug falls back to the official name.
    assert.equal((await detectClaude({ home: dir, now })).project, "Astra's PetOS");
    appendFileSync(file, rename('Discord Damsel'));
    assert.equal((await detectClaude({ home: dir, now })).project, 'Discord Damsel');
    // Renamed again later in a long session: only the appended bytes are read, and the newest name wins.
    appendFileSync(file, reply(folder, now - 1000) + rename("Astra's PetOS fixes") + reply(folder, now - 500));
    assert.equal((await detectClaude({ home: dir, now })).project, "Astra's PetOS fixes");
    // Project sharing off: names are not read at all.
    assert.equal((await detectClaude({ home: dir, now, names: false })).sessions[0].project, "Astra's PetOS");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('only real rename records count, never text that mentions one or an automatic title', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-names-'));
  const file = join(dir, 'session-20261014.jsonl');
  try {
    writeFileSync(file, [
      JSON.stringify({ type: 'ai-title', aiTitle: 'Automatic title from the first message' }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'set {"type":"custom-title","customTitle":"Injected"}' } }),
      JSON.stringify({ type: 'summary', summary: 'Long summary' }),
      '{"type":"custom-title","customTitle":"broken', // incomplete line at the end: not read yet
    ].join('\n'));
    assert.equal(sessionName(file), '');
    appendFileSync(file, '"}\n' + rename('  Real\nname '));
    assert.equal(sessionName(file), 'Real name');
    assert.equal(sessionName(join(dir, 'missing.jsonl')), '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a huge record before a rename does not hide it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-huge-'));
  const file = join(dir, 'session-20261014.jsonl');
  try {
    writeFileSync(file, JSON.stringify({ type: 'user', toolUseResult: 'x'.repeat(9 * 1024 * 1024) }) + '\n' + rename('After the big one'));
    assert.equal(sessionName(file), 'After the big one');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('every active project takes a turn every few seconds', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'claude-shuffle-'));
  try {
    const now = Date.now();
    const names = ['paper-girl', 'fuzzbois', 'mommys'];
    names.forEach((name, i) => {
      mkdirSync(join(dir, 'projects', name), { recursive: true }); mkdirSync(join(dir, name));
      writeFileSync(join(dir, 'projects', name, `s${i}-20261014.jsonl`), reply(join(dir, name), now - 1000 * (i + 1)));
    });
    // A second session in the same project with the same model does not get an extra turn.
    writeFileSync(join(dir, 'projects', 'paper-girl', 's9-20261014.jsonl'), reply(join(dir, 'paper-girl'), now - 500));
    const found = await detectClaude({ home: dir, now });
    assert.deepEqual(rotationCards(found.sessions).map(card => card.project), ['paper-girl', 'fuzzbois', 'mommys']);
    const states = [0, 1, 2, 3].map(i => {
      const s = selectSession(found, { shareProject: true }, i * ROTATE_MS);
      return activity(1, undefined, s.project, s.model, s.effort).state;
    });
    assert.deepEqual(states, ['Working on paper-girl', 'Working on fuzzbois', 'Working on mommys', 'Working on paper-girl']);
    assert.equal(folderProject(join(dir, 'paper-girl')), 'paper-girl');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
