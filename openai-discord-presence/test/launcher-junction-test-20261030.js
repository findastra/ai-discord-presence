import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const app = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).name;
const launcher = new URL('../src/launch.js', import.meta.url);
const harness = `
  import assert from 'node:assert/strict';
  const [target, entryPath, app, expectedReads] = process.argv.slice(1);
  const { SOURCE_IDENTITY } = await import(new URL('./source-identity-20261008.js', target));
  let reads = 0;
  globalThis.fetch = async url => {
    assert.match(url, /^http:\\/\\/127\\.0\\.0\\.1:3876[12]\\/api\\/status$/);
    reads++;
    return { ok: true, json: async () => ({ app, identity: SOURCE_IDENTITY }) };
  };
  process.argv = entryPath === 'no-entry' ? [process.execPath] : [process.execPath, entryPath, '--background'];
  await import(target);
  assert.equal(reads, Number(expectedReads), 'the command-line entrypoint must run; ordinary imports must not');
`;

function run(target, entryPath, expectedReads) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', harness,
    target.href, entryPath, app, String(expectedReads)], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function linkedLauncher(t) {
  const scratch = mkdtempSync(join(tmpdir(), 'presence-launch-20261030-'));
  const link = join(scratch, 'linked-app-20261030');
  t.after(() => { try { unlinkSync(link); } finally { rmdirSync(scratch); } });
  symlinkSync(appRoot, link, process.platform === 'win32' ? 'junction' : 'dir');
  return pathToFileURL(join(link, 'src', 'launch.js'));
}

test('direct command-line invocation enters the launcher', () => {
  run(launcher, fileURLToPath(launcher), 2);
});

test('command-line invocation through a real junction or symlink enters the launcher', t => {
  const linked = linkedLauncher(t);
  run(linked, fileURLToPath(linked), 2);
});

test('importing through a junction or symlink does not launch the app', t => {
  run(linkedLauncher(t), fileURLToPath(import.meta.url), 0);
});

test('importing without a command-line entrypoint does not launch the app', () => {
  run(launcher, 'no-entry', 0);
});

