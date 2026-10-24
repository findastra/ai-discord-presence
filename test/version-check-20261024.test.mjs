// Discord Damsel's version check (discord-tower/version-check): installed versions read from the PC's files, newest
// ones from GitHub (here a pretend GitHub), and the answer saved where the Sticker Manager plugin reads it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as V from '../discord-tower/version-check/discord-damsel-version-check-20261024.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pluginFile = join(root, 'discord-tower/sticker-manager/discord-damsel-sticker-manager-20261018.plugin.js');
const pluginSource = readFileSync(pluginFile, 'utf8');

// The bit of BetterDiscord 1.14.3's own code that holds its version (from its betterdiscord.asar, 2026-10-24).
const asarText = (v) => 'equire("path"),1);ft();$s=class extends ce{data={branch:"main",commit:"6d51b92d",build:"production",version:"' + v + '",appPath:process.env.DISCORD_APP_PATH}';

function fakePc({ bd = '1.14.3', plugin = pluginSource } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ddvc-'));
  const p = { asar: join(dir, 'data', 'betterdiscord.asar'), plugins: join(dir, 'plugins') };
  mkdirSync(join(dir, 'data'));
  mkdirSync(p.plugins);
  if (bd) writeFileSync(p.asar, 'header' + asarText(bd) + 'more code');
  if (plugin) writeFileSync(join(p.plugins, 'discord-damsel-sticker-manager-20261018.plugin.js'), plugin);
  writeFileSync(join(p.plugins, 'other.plugin.js'), '/**\n * @name Other\n * @version 9.9.9\n */');
  return { dir, p, done: () => rmSync(dir, { recursive: true, force: true }) };
}

function fakeGitHub({ bd = 'v1.14.4', plugin = '1.0.4', down = false } = {}) {
  const asked = [];
  const fetchImpl = async (url, options) => {
    asked.push({ url, options });
    if (down) throw new Error('offline');
    if (url === V.BD_RELEASE) return { ok: true, status: 200, json: async () => ({ tag_name: bd }) };
    if (url === V.PLUGIN_ON_MAIN) return { ok: true, status: 200, text: async () => '/**\n * @name DiscordDamselStickerManager\n * @version ' + plugin + '\n */' };
    return { ok: false, status: 404 };
  };
  return { fetchImpl, asked };
}

test('the file is named by the repo rules and asks only GitHub, with no token', () => {
  const file = join(root, 'discord-tower/version-check/discord-damsel-version-check-20261024.mjs');
  assert.match(basename(file), /^[a-z0-9-]+-\d{8}\.mjs$/);
  const code = readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => !/^\s*\/\//.test(line)).join('\n');
  assert.deepEqual([...new Set(code.match(/https:\/\/[a-z.]+/g))], ['https://api.github.com', 'https://raw.githubusercontent.com']);
  assert.doesNotMatch(code, /\btoken\b|authorization|GITHUB_TOKEN/i);
  assert.equal(V.PLUGIN_ON_MAIN, JSON.parse(readFileSync(join(root, 'pet.json'), 'utf8')).tools.find((t) => t.name === 'sticker-manager').links.download,
    'the same plugin file pet.json offers for download');
});

test('versions: v-prefixed tags, numeric order, and nothing that is not a version', () => {
  assert.equal(V.clean('v1.14.4'), '1.14.4');
  assert.equal(V.clean('1.14.4-beta'), null);
  assert.ok(V.compare('1.14.3', '1.14.4') < 0);
  assert.ok(V.compare('1.0.10', '1.0.9') > 0);
  assert.equal(V.compare('1.14', '1.14.0'), 0);
  assert.equal(V.bdVersionIn(asarText('1.14.3')), '1.14.3');
  assert.equal(V.bdVersionIn('nothing here'), null);
  assert.deepEqual(V.pluginHeader(pluginSource), { name: 'DiscordDamselStickerManager', version: '1.0.4' });
});

test('it reads the installed versions from BetterDiscord\'s file and the plugins folder', () => {
  const pc = fakePc();
  try { assert.deepEqual(V.installed(pc.p), { betterdiscord: '1.14.3', plugin: '1.0.4' }); } finally { pc.done(); }
  const bare = fakePc({ bd: null, plugin: null });
  try { assert.deepEqual(V.installed(bare.p), { betterdiscord: null, plugin: null }); } finally { bare.done(); }
  assert.deepEqual(V.installed({ asar: '/no/such/file', plugins: '/no/such/folder' }), { betterdiscord: null, plugin: null });
});

test('a newer BetterDiscord: saved for the plugin, and the plugin lights its maintenance light from it', async () => {
  const pc = fakePc(), gh = fakeGitHub(), said = [];
  try {
    const r = await V.main(['--plugins-dir', pc.p.plugins, '--asar', pc.p.asar], { fetchImpl: gh.fetchImpl, log: (l) => said.push(l) });
    assert.deepEqual({ ...r, checkedAt: 'x' }, {
      checkedAt: 'x', betterdiscord: { installed: '1.14.3', latest: '1.14.4', behind: true },
      plugin: { installed: '1.0.4', latest: '1.0.4', behind: false }, needsMaintenance: true, errors: [] });
    assert.deepEqual(gh.asked.map((a) => a.url).sort(), [V.BD_RELEASE, V.PLUGIN_ON_MAIN].sort());
    assert.ok(gh.asked.every((a) => !a.options.headers.authorization));
    assert.equal(said[0], 'BetterDiscord 1.14.4 is out (this PC has 1.14.3). In Discord: User Settings > Updates (BetterDiscord) > Update.');
    assert.equal(said[1], 'Sticker Manager 1.0.4 is the newest.');

    // The file is BetterDiscord's plugin data format ({ key: value }), under the name the plugin reads.
    const file = join(pc.p.plugins, 'DiscordDamselVersionCheck.config.json');
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    assert.deepEqual(Object.keys(saved), ['result']);
    assert.ok(!existsSync(join(pc.p.plugins, 'DiscordDamselStickerManager.config.json')), 'the plugin\'s own file is never touched');
    assert.match(pluginSource, /^const VERSION_CHECK = 'DiscordDamselVersionCheck';$/m);
    const module = { exports: {} };
    new Function('require', 'module', 'exports', pluginSource.replace(/\r\n/g, '\n'))(() => ({}), module, module.exports);
    assert.deepEqual(module.exports.Core.versionNotices(saved.result, { betterdiscord: '1.14.3', plugin: '1.0.4' }),
      ['BetterDiscord 1.14.4 is out (you have 1.14.3). Update it: User Settings › Updates (BetterDiscord) › Update.']);
  } finally { pc.done(); }
});

test('a newer plugin on main counts too; up to date says so', async () => {
  const pc = fakePc({ bd: '1.14.4' });
  try {
    const behind = await V.main(['--plugins-dir', pc.p.plugins, '--asar', pc.p.asar, '--quiet'], { fetchImpl: fakeGitHub({ plugin: '1.0.5' }).fetchImpl, log: () => assert.fail('--quiet says nothing') });
    assert.deepEqual([behind.betterdiscord.behind, behind.plugin.behind, behind.needsMaintenance], [false, true, true]);
    const said = [];
    const fine = await V.main(['--plugins-dir', pc.p.plugins, '--asar', pc.p.asar], { fetchImpl: fakeGitHub().fetchImpl, log: (l) => said.push(l) });
    assert.equal(fine.needsMaintenance, false);
    assert.equal(said[2], 'Nothing to update.');
  } finally { pc.done(); }
});

test('offline or not installed: no yellow light, and it says why instead of failing', async () => {
  const pc = fakePc();
  try {
    const r = await V.main(['--plugins-dir', pc.p.plugins, '--asar', pc.p.asar, '--quiet'], { fetchImpl: fakeGitHub({ down: true }).fetchImpl });
    assert.equal(r.needsMaintenance, false);
    assert.deepEqual(r.errors, ['BetterDiscord: offline', 'Sticker Manager: offline']);
    assert.match(V.lines(r)[0], /could not ask GitHub/);
  } finally { pc.done(); }
  const none = V.result({ betterdiscord: null, plugin: null }, { betterdiscord: '1.14.4', plugin: '1.0.4' });
  assert.equal(none.needsMaintenance, false);
  assert.equal(V.lines(none)[0], 'BetterDiscord: not installed on this PC.');
  assert.equal(V.save({ plugins: join(tmpdir(), 'ddvc-no-such-folder') }, none), null, 'no plugins folder: nothing written');
});

test('Discord Damsel\'s start runs the check in the background, after the presence apps', () => {
  const cmd = readFileSync(join(root, 'start-discord-damsel-20261014.cmd'), 'utf8').replace(/\r\n/g, '\n');
  const line = 'start "" /b "%PRESENCE_NODE%" discord-tower\\version-check\\discord-damsel-version-check-20261024.mjs --quiet';
  assert.ok(cmd.includes(line), 'start line');
  assert.ok(cmd.indexOf(line) > cmd.indexOf('anthropic-discord-presence\\src\\launch.js'));
});
