import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectClaude, desktopSessionRoots, desktopSessions, folderProject, topLevelSession } from '../src/detector.js';

const reply = (cwd, at, model = 'claude-opus-5-5') => JSON.stringify({ type: 'assistant', timestamp: new Date(at).toISOString(), cwd,
  effort: 'high', message: { role: 'assistant', model } }) + '\n';
const rename = name => JSON.stringify({ type: 'custom-title', customTitle: name, sessionId: 's' }) + '\n';

// A fake ~/.claude plus the desktop app's session files, laid out as on Windows.
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'claude-top-'));
  const folder = join(dir, 'paper-girl'); mkdirSync(folder);
  mkdirSync(join(dir, 'home', 'projects', 'p'), { recursive: true });
  const desktop = join(dir, 'Claude-Data', 'claude_x', 'claude-code-sessions');
  mkdirSync(join(desktop, 'account', 'org'), { recursive: true });
  const transcript = (cli, ...lines) => writeFileSync(join(dir, 'home', 'projects', 'p', `${cli}.jsonl`), lines.join(''));
  const session = (local, fields) => writeFileSync(join(desktop, 'account', 'org', `local_${local}.json`),
    JSON.stringify({ sessionId: `local_${local}`, title: 'Title from the app, never shown', lastTurnReport: 'Never shown', ...fields }));
  return { dir, folder, home: join(dir, 'home'), desktop, transcript, session };
}

test('a sub-chat shows its top-level chat name, as in the sidebar', async () => {
  const { dir, folder, home, desktop, transcript, session } = setup();
  try {
    const now = Date.now();
    transcript('parent', rename('Linux Penguin - MacAttack'), reply(folder, now - 60_000));
    transcript('child', rename("Linux readiness check for Astra's PetOS"), reply(folder, now - 1000));
    session('p', { cliSessionId: 'parent' });
    session('c', { cliSessionId: 'child', spawnedFrom: { sessionId: 'local_p', title: "Linux readiness check for Astra's PetOS", sideSession: true } });
    const found = await detectClaude({ home, now, desktopRoots: [desktop] });
    assert.equal(found.project, 'Linux Penguin - MacAttack');
    // Parent and sub-chat working at once, same model: one turn, not two.
    assert.deepEqual(found.sessions.map(s => s.project), ['Linux Penguin - MacAttack']);
    // Project sharing off: the card shows the folder and the desktop files are not needed.
    assert.equal((await detectClaude({ home, now, names: false, desktopRoots: [desktop] })).project, 'paper-girl');
    // Without the desktop app's files (Claude Code in a terminal), each session keeps its own name.
    assert.equal((await detectClaude({ home, now, desktopRoots: [] })).project, "Linux readiness check for Astra's PetOS");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('nested sub-chats climb to the top; detached or orphaned ones keep their own name', async () => {
  const { dir, folder, home, desktop, transcript, session } = setup();
  try {
    const now = Date.now();
    transcript('root', rename('Pet Icons'));
    transcript('mid', rename('Pet Icons - Sharing'));
    transcript('leaf', rename('Pet Icons - Unified Bodies'), reply(folder, now - 1000));
    session('r', { cliSessionId: 'root' });
    session('m', { cliSessionId: 'mid', spawnedFrom: { sessionId: 'local_r' } });
    session('l', { cliSessionId: 'leaf', spawnedFrom: { sessionId: 'local_m' } });
    assert.equal((await detectClaude({ home, now, desktopRoots: [desktop] })).project, 'Pet Icons');
    // Detached later in the app: it is top-level now.
    session('l', { cliSessionId: 'leaf', spawnedFrom: { sessionId: 'local_m' }, lineageDetached: true });
    assert.equal((await detectClaude({ home, now, desktopRoots: [desktop] })).project, 'Pet Icons - Unified Bodies');
    // Parent deleted: the sidebar lists it at the top, so does the card.
    session('l', { cliSessionId: 'leaf', spawnedFrom: { sessionId: 'local_gone' } });
    assert.equal((await detectClaude({ home, now, desktopRoots: [desktop] })).project, 'Pet Icons - Unified Bodies');
    // A loop in the records cannot hang the check: it stops where it started.
    session('r', { cliSessionId: 'root', spawnedFrom: { sessionId: 'local_l' } });
    session('l', { cliSessionId: 'leaf', spawnedFrom: { sessionId: 'local_m' } });
    assert.equal(topLevelSession('leaf', desktopSessions([desktop])), undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a top-level chat without a name shows the folder, never the sub-chat name', async () => {
  const { dir, folder, home, desktop, transcript, session } = setup();
  try {
    const now = Date.now();
    // Parent transcript in another project folder (a different working folder).
    mkdirSync(join(home, 'projects', 'other'));
    writeFileSync(join(home, 'projects', 'other', 'parent.jsonl'), reply(folder, now - 60_000));
    transcript('child', rename('Refresh Pet Program page'), reply(folder, now - 1000));
    session('p', { cliSessionId: 'parent' });
    session('c', { cliSessionId: 'child', spawnedFrom: { sessionId: 'local_p' } });
    assert.equal((await detectClaude({ home, now, desktopRoots: [desktop] })).project, 'paper-girl');
    appendFileSync(join(home, 'projects', 'other', 'parent.jsonl'), rename('Unity Unicorn - Updates'));
    assert.equal((await detectClaude({ home, now, desktopRoots: [desktop] })).project, 'Unity Unicorn - Updates');
    // Parent with no transcript on this computer: the folder again.
    session('p', {});
    assert.equal((await detectClaude({ home, now, desktopRoots: [desktop] })).project, 'paper-girl');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the desktop session folders are found for both Windows builds; broken files are skipped', () => {
  const { dir, desktop, session } = setup();
  try {
    assert.deepEqual(desktopSessionRoots({ LOCALAPPDATA: dir, APPDATA: join(dir, 'missing') }), [desktop]);
    writeFileSync(join(desktop, 'account', 'org', 'local_half.json'), '{"sessionId":"local_half","cliSess');
    session('ok', { cliSessionId: '../../escape' });
    const sessions = desktopSessions([desktop]);
    assert.equal(sessions.byLocal.has('local_half'), false);
    assert.equal(sessions.byLocal.get('local_ok').cli, '');
    // The Store build's no-folder workspace is not a project either.
    assert.equal(folderProject(join(dir, 'Claude-Data', 'claude_x', 'scratch-workspaces', 'a', 'b')), '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
