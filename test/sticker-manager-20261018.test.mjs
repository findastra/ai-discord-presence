// Discord Damsel's Sticker Manager (discord-tower-v1.0-sticker-manager-v1.0): the plugin's logic and how it uses
// Discord's own stores, checked with fake stores. The panel itself is checked in test/sticker-manager-harness-20261018.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = join(root, 'discord-tower/sticker-manager/discord-damsel-sticker-manager-20261018.plugin.js');
// A Windows checkout may turn line ends into CRLF; BetterDiscord reads either.
const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// Load it the way BetterDiscord does: wrapped in a function with module and exports.
function load() {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', '__filename', '__dirname', source)(() => ({}), module, module.exports, file, root);
  return module.exports;
}
const Plugin = load();
const { Core } = Plugin;
const { findDiscord, readServers, readFavorites, saveFavorites } = Plugin.internals;

const sticker = (id, name, extra = {}) => ({ id, name, tags: 'tag', format_type: 1, guild_id: '1', ...extra });

test('the file is a BetterDiscord plugin with Astra credited, named by the repo rules', () => {
  assert.match(source, /^\/\*\*\n \* @name DiscordDamselStickerManager\n/);
  assert.match(source, / \* @author Astra\n/);
  assert.match(source, / \* @version 1\.0\.1\n/);
  assert.equal(typeof Plugin, 'function');
  assert.equal(typeof Plugin.prototype.getSettingsPanel, 'function');
  assert.match(basename(file), /^[a-z0-9-]+-\d{8}\.plugin\.js$/);
});

// Panels, not modules (Astra, 2026-10-19): a box on a page is a panel; a module is a file of code.
test('its box is Discord Damsel\'s servers panel, the same name as in pet.json and on her page', () => {
  assert.match(source, /^const PANEL = 'discord-damsel-servers-panel';$/m);
  assert.match(source, /el\('fieldset', \{ class: 'ddsm-panel' \}, el\('legend', \{\}, PANEL\)\)/);
  assert.doesNotMatch(source, /servers-module|ddsm-module|MODULE/);
  const pet = JSON.parse(readFileSync(join(root, 'pet.json'), 'utf8'));
  const tool = pet.tools.find((t) => t.name === 'sticker-manager');
  assert.equal(tool.panel, 'discord-damsel-servers-panel');
  assert.equal(tool.module, undefined);
  assert.equal(tool.version, '1.0.1');
  assert.match(readFileSync(join(root, 'findastra-discord-presence-20261008.html'), 'utf8'), /In her servers panel \(discord-damsel-servers-panel\)/);
});

test('it never makes its own requests, never reads a token and never writes HTML', () => {
  for (const pattern of [/\bfetch\(/, /XMLHttpRequest/, /RestAPI/, /getToken/i, /\btoken\b/i, /innerHTML/, /outerHTML/, /insertAdjacentHTML/, /eval\(/]) {
    const code = source.split('\n').filter((line) => !/^\s*(\*|\/\/)/.test(line)).join('\n');
    assert.doesNotMatch(code, pattern);
  }
});

test('ids keeps order, drops repeats and anything that is not a sticker ID', () => {
  assert.deepEqual(Core.ids(['3', 2, '3', 'x', '1/../2', null, 10n]), ['3', '2', '10']);
});

test('servers follow the server list, then the rest by name; stickers are cleaned up', () => {
  const guilds = [{ id: '1', name: 'Zebra', icon: null }, { id: '2', name: 'Apple' }, { id: '3', name: 'Mango' }, { id: '4', name: 'banana' }];
  const stickers = { 1: [sticker('11', 'wave'), { id: 'bad' }], 3: [] };
  const servers = Core.collectServers(guilds, ['3', '99', '1', '3'], (id) => stickers[id]);
  assert.deepEqual(servers.map((s) => s.name), ['Mango', 'Zebra', 'Apple', 'banana']);
  assert.deepEqual(servers.map((s) => s.loaded), [true, true, false, false]);
  assert.deepEqual(servers[1].stickers, [{ id: '11', name: 'wave', tags: 'tag', description: '', format: 1, available: true, guildId: '1' }]);
});

test('search finds servers by name (all their stickers) or stickers by name and tags', () => {
  const servers = Core.collectServers([{ id: '1', name: 'Cat Cafe' }, { id: '2', name: 'Dogs' }],
    [], (id) => (id === '1' ? [sticker('11', 'meow'), sticker('12', 'hiss')] : [sticker('21', 'woof', { tags: 'happy' })]));
  assert.equal(Core.filter(servers, '').length, 2);
  const cat = Core.filter(servers, 'cat');
  assert.deepEqual(cat.map((m) => [m.server.name, m.stickers.length, m.serverMatch]), [['Cat Cafe', 2, true]]);
  assert.deepEqual(Core.filter(servers, 'HAPPY').map((m) => m.stickers.map((s) => s.name)), [['woof']]);
  assert.deepEqual(Core.filter(servers, 'nothing'), []);
});

test('a reset plan says what is added and taken off, and when nothing changes', () => {
  assert.deepEqual(Core.plan(['1', '2', '3'], ['3', '4']), { now: ['1', '2', '3'], next: ['3', '4'], added: ['4'], removed: ['1', '2'], same: false });
  assert.equal(Core.plan(['1', '2'], ['1', '2']).same, true);
  assert.equal(Core.plan(['1', '2'], ['2', '1']).same, false, 'a new order is a change');
  assert.deepEqual(Core.togglePick(['1', '2'], '1'), ['2']);
  assert.deepEqual(Core.togglePick(['1'], 5), ['1', '5']);
});

test('pictures come only from Discord\'s own servers, and odd values give no picture', () => {
  assert.equal(Core.stickerUrl({ id: '11', format: 1 }), 'https://media.discordapp.net/stickers/11.png?size=160');
  assert.equal(Core.stickerUrl({ id: '11', format: 4 }, 80), 'https://media.discordapp.net/stickers/11.gif?size=80');
  assert.equal(Core.stickerUrl({ id: '11', format: 3 }), null, 'Lottie stickers have no picture file');
  assert.equal(Core.iconUrl({ id: '5', icon: 'a_' + 'f'.repeat(32) }), 'https://cdn.discordapp.com/icons/5/a_' + 'f'.repeat(32) + '.gif?size=64');
  assert.equal(Core.iconUrl({ id: '5', icon: '../../x' }), null);
  assert.equal(Core.iconUrl({ id: '5', icon: null }), null);
  assert.equal(Core.initials('Press Plai Club Night'), 'PPC');
});

// Fake Discord: the stores and the favorites saver, shaped like Discord's (see the Vencord type files).
function fakeDiscord({ favorites = ['11'], handOver = true, keep = true, bigints = false } = {}) {
  const value = { favoriteStickers: handOver ? { stickerIds: favorites.map((id) => (bigints ? BigInt(id) : id)) } : undefined };
  const calls = [];
  const frecency = {
    ProtoClass: { typeName: 'discord_protos.discord_users.v1.FrecencyUserSettings' },
    getCurrentValue: () => value,
    async updateAsync(field, updater, delay) {
      calls.push({ field, delay });
      const copy = value[field] ? { stickerIds: [...value[field].stickerIds] } : undefined;
      if (updater(copy) === false) return;
      if (keep) value[field] = copy;
    },
  };
  const stores = {
    GuildStore: { getGuilds: () => ({ 1: { id: '1', name: 'One' }, 2: { id: '2', name: 'Two' } }) },
    SortedGuildStore: { getFlattenedGuildIds: () => ['2', '1'] },
    StickersStore: {
      getStickersByGuildId: (id) => (id === '1' ? [sticker('11', 'wave')] : undefined),
      getAllGuildStickers: () => new Map([['2', [sticker('21', 'hi', { guild_id: '2' })]]]),
    },
  };
  const modules = [{ unrelated: true }, { INFREQUENT_USER_ACTION: 0, FREQUENT_USER_ACTION: 10 }, frecency];
  const api = {
    Webpack: {
      getStore: (name) => stores[name],
      getModule: (filter) => modules.find((m) => filter(m)),
    },
  };
  return { api, value, calls };
}

test('it finds Discord\'s stores and favorites saver, and reads servers and favorites', () => {
  const { api } = fakeDiscord();
  const d = findDiscord(api);
  assert.ok(d.frecency && d.guilds && d.sorted && d.stickers);
  assert.equal(d.delay, 0);
  const servers = readServers(d);
  assert.deepEqual(servers.map((s) => [s.name, s.stickers.map((x) => x.name)]), [['Two', ['hi']], ['One', ['wave']]]);
  assert.deepEqual(readFavorites(d), ['11']);
});

test('a reset replaces the favorites through Discord\'s saver and reads them back', async () => {
  const { api, value, calls } = fakeDiscord({ favorites: ['11', '12'] });
  const d = findDiscord(api);
  assert.deepEqual(await saveFavorites(d, ['21', '11', '21']), ['21', '11']);
  assert.deepEqual(value.favoriteStickers.stickerIds, ['21', '11']);
  assert.deepEqual(calls, [{ field: 'favoriteStickers', delay: 0 }]);
});

test('IDs stay the type Discord uses', async () => {
  const { api, value } = fakeDiscord({ favorites: ['11'], bigints: true });
  await saveFavorites(findDiscord(api), ['21']);
  assert.deepEqual(value.favoriteStickers.stickerIds, [21n]);
});

test('nothing changes, and it says why, when Discord does not hand over or keep the list', async () => {
  const empty = fakeDiscord({ handOver: false });
  await assert.rejects(saveFavorites(findDiscord(empty.api), ['21']), /did not hand over/);
  assert.equal(empty.value.favoriteStickers, undefined);

  const dropped = fakeDiscord({ favorites: ['11'], keep: false });
  await assert.rejects(saveFavorites(findDiscord(dropped.api), ['21']), /did not confirm/);
  assert.deepEqual(dropped.value.favoriteStickers.stickerIds, ['11']);

  await assert.rejects(saveFavorites({ frecency: null, delay: 0 }, ['21']), /Nothing was changed/);
});

test('without Discord\'s server list it says so instead of showing an empty list', () => {
  assert.throws(() => readServers({ guilds: null }), /Could not find Discord's server list/);
});
