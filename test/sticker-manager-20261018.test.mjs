// Discord Damsel's Sticker Manager (discord-tower-v1.0-sticker-manager-v1.0): the plugin's logic and how it uses
// Discord's own stores, checked with fake stores. The panel itself is checked in test/sticker-manager-harness-20261018.html.
import test, { after } from 'node:test';
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
const { findDiscord, readServers, readFavorites, saveFavorites, confirmContent } = Plugin.internals;

const sticker = (id, name, extra = {}) => ({ id, name, tags: 'tag', format_type: 1, guild_id: '1', ...extra });

test('the file is a BetterDiscord plugin with Astra credited, named by the repo rules', () => {
  assert.match(source, /^\/\*\*\n \* @name DiscordDamselStickerManager\n/);
  assert.match(source, / \* @author Astra\n/);
  assert.match(source, / \* @version 1\.0\.2\n/);
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
  assert.equal(tool.version, '1.0.2');
  // Her page draws the same panel around the tool box (test/damsel-page-panels-20261019.test.mjs checks how).
  assert.match(readFileSync(join(root, 'findastra-discord-presence-20261008.html'), 'utf8'), /panelBox\('discord-damsel-servers-panel'\)/);
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

// 1.0.2, after the first test inside Discord (2026-10-19): Astra had 0 favorites, so the copy saved before the reset
// was an empty list, and "Put back" never showed. An empty copy is a real copy; nothing saved is not.
test('an empty saved list is a copy to put back; nothing saved is not', () => {
  for (const nothing of [null, undefined, {}, { stickerIds: 'x' }, 'x']) assert.equal(Core.backup(nothing), null);
  assert.deepEqual(Core.backup({ stickerIds: [] }), { savedAt: '', ids: [] });
  assert.deepEqual(Core.backup({ savedAt: '2026-10-20T02:05:58.618Z', stickerIds: ['5', 5, 'x'] }), { savedAt: '2026-10-20T02:05:58.618Z', ids: ['5'] });

  assert.equal(Core.putBackLabel(['1', '2'], null), null, 'nothing saved yet: no button');
  assert.equal(Core.putBackLabel(['1', '2'], Core.backup({ stickerIds: [] })), 'Put back: no favorites (clear the 2 now)');
  assert.equal(Core.putBackLabel([], Core.backup({ stickerIds: [] })), null, 'already empty: nothing to put back');
  assert.equal(Core.putBackLabel(['1'], Core.backup({ stickerIds: ['5', '6'] })), 'Put back my previous favorites (2)');
});

test('a reset never clears the favorites; putting back an empty list does, after its own confirmation', () => {
  assert.equal(Core.confirmation(['1', '2'], [], 'reset'), null, 'no picks: nothing to confirm');
  assert.equal(Core.confirmation(['1', '2'], ['1', '2'], 'reset'), null);
  const reset = Core.confirmation([], ['21', '11'], 'reset');
  assert.equal(reset.title, 'Reset your favorite stickers?');
  assert.deepEqual(reset.plan.next, ['21', '11']);
  assert.equal(reset.danger, false);

  const clear = Core.confirmation(['21', '11'], [], 'undo');
  assert.equal(clear.title, 'Put back your previous favorites?');
  assert.deepEqual(clear.plan.next, []);
  assert.equal(clear.confirmText, 'Clear my favorites');
  assert.equal(clear.danger, true);
  assert.deepEqual(clear.lines.slice(0, 3), ['Your favorite stickers now: 2 stickers.', 'After this: no favorite stickers, as before the last reset.', '0 stickers added, 2 stickers taken off.']);
  assert.equal(Core.done('undo', 0), 'Put back: no favorite stickers, as before the last reset.');
  assert.equal(Core.done('reset', 2), 'Favorites reset to 2 stickers.');
});

test('saving from an empty list and back to one goes through Discord\'s saver and reads back', async () => {
  const fromEmpty = fakeDiscord({ favorites: [] });
  assert.deepEqual(await saveFavorites(findDiscord(fromEmpty.api), ['21', '11']), ['21', '11']);
  assert.deepEqual(fromEmpty.value.favoriteStickers.stickerIds, ['21', '11'], 'no sample to copy, so string IDs (Discord kept them on 2026-10-19)');

  for (const bigints of [false, true]) {
    const toEmpty = fakeDiscord({ favorites: ['21', '11'], bigints });
    assert.deepEqual(await saveFavorites(findDiscord(toEmpty.api), []), []);
    assert.deepEqual(toEmpty.value.favoriteStickers.stickerIds, []);
    assert.deepEqual(readFavorites(findDiscord(toEmpty.api)), []);
  }

  const kept = fakeDiscord({ favorites: ['21'], keep: false });
  await assert.rejects(saveFavorites(findDiscord(kept.api), []), /did not confirm/, 'a clear Discord did not keep is not reported as done');
});

// How BetterDiscord 1.14.3 draws showConfirmationModal's content (src/betterdiscord/ui/modals.ts): each string goes
// through SimpleMarkdownExt.parseToReact(c), Discord's inline markdown, with nothing between the strings; React
// elements are drawn as they are, and a div is a block of its own.
function drawLikeBd(content) {
  const drawn = [].concat(content).map((c) => (typeof c === 'string' ? c : '\n' + [].concat(c.props.children).join('') + '\n'));
  return drawn.join('').replace(/\n+/g, '\n').trim();
}
const fakeReact = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } }) };

test('the confirmation\'s sentences are separate paragraphs, not run together', () => {
  const { lines } = Core.confirmation(['1'], ['21', '22'], 'reset');
  assert.match(drawLikeBd(lines), /sticker\.After this/, '1.0.1 handed over plain strings, which ran together in Discord');

  const content = confirmContent({ React: fakeReact }, lines);
  assert.deepEqual(content.map((e) => e.type), ['div', 'div', 'div', 'div']);
  assert.deepEqual(content.map((e) => e.props.children), lines);
  assert.ok(content.every((e) => e.props.style.margin === '0 0 12px'));
  const drawn = drawLikeBd(content);
  assert.doesNotMatch(drawn, /[.)][A-Z0-9]/, 'no sentence starts right after the last one ends');
  assert.deepEqual(drawn.split(/\n+/), lines);

  assert.equal(confirmContent({}, ['One.', 'Two.']), 'One.\n\nTwo.', 'without BdApi.React: one string with blank lines');
});

// The panel itself, with a pretend page: just the parts of the DOM the plugin uses. Clicks skip disabled buttons, as
// in a browser. The harness page (test/sticker-manager-harness-20261018.html) checks the same in a real browser.
function fakeDocument() {
  class FakeText { constructor(text) { this.text = text; } get textContent() { return this.text; } }
  class FakeNode {
    constructor(tag) { Object.assign(this, { tagName: tag, children: [], attrs: {}, on: {}, className: '', disabled: false, hidden: false, title: '', parent: null }); }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    append(...kids) { for (const kid of kids) { const node = typeof kid === 'string' ? new FakeText(kid) : kid; node.parent = this; this.children.push(node); } }
    replaceChildren(...kids) { this.children = []; this.append(...kids); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); }
    addEventListener(type, fn) { (this.on[type] ||= []).push(fn); }
    click() { if (!this.disabled) for (const fn of this.on.click || []) fn(); }
    get textContent() { return this.children.map((c) => c.textContent).join(''); }
    set textContent(value) { this.children = []; if (String(value)) this.append(String(value)); }
    all() { return this.children.flatMap((c) => (c instanceof FakeNode ? [c, ...c.all()] : [])); }
    querySelectorAll(selector) { return selector.startsWith('.') ? this.all().filter((n) => n.className.split(' ').includes(selector.slice(1))) : []; }
  }
  return { createElement: (tag) => new FakeNode(tag), createTextNode: (text) => new FakeText(text) };
}

function openPanel(discord, saved = {}) {
  const data = JSON.parse(JSON.stringify(saved)), modals = [], toasts = [];
  globalThis.document = fakeDocument();
  globalThis.BdApi = {
    ...discord.api,
    DOM: { addStyle() {}, removeStyle() {} },
    Data: { load: (name, key) => data[key], save: (name, key, value) => { data[key] = JSON.parse(JSON.stringify(value)); } },
    UI: { showConfirmationModal: (title, content, options) => modals.push({ title, content, options }), showToast: (text) => toasts.push(text) },
    React: fakeReact,
  };
  const root = new Plugin({ name: 'DiscordDamselStickerManager' }).getSettingsPanel();
  const buttons = () => root.all().filter((n) => n.tagName === 'button').map((n) => n.textContent);
  const press = (text) => {
    const b = root.all().find((n) => n.tagName === 'button' && n.textContent === text);
    assert.ok(b, 'no button "' + text + '" in ' + JSON.stringify(buttons()));
    b.click();
    return b;
  };
  const status = () => root.all().find((n) => n.attrs.role === 'status').textContent;
  return { data, modals, toasts, buttons, press, status };
}
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r)); };
after(() => { delete globalThis.document; delete globalThis.BdApi; });

test('panel: reset from no favorites, then put back the empty list', async () => {
  const discord = fakeDiscord({ favorites: [] });
  const p = openPanel(discord, { picks: ['21', '11'] });
  assert.ok(!p.buttons().some((t) => t.startsWith('Put back')), 'nothing saved yet: no Put back');

  p.press('Reset my favorites to these 2');
  assert.equal(p.modals.length, 1);
  assert.equal(p.modals[0].title, 'Reset your favorite stickers?');
  assert.match(drawLikeBd(p.modals[0].content), /^Your favorite stickers now: 0 stickers\.\nAfter this: 2 stickers, in the order shown \(your picks\)\.\n2 stickers added, 0 stickers taken off\.\n/);
  p.modals[0].options.onConfirm();
  await settle();
  assert.deepEqual(discord.value.favoriteStickers.stickerIds, ['21', '11']);
  assert.deepEqual(p.data.backup.stickerIds, [], 'the copy from before is the empty list');
  assert.equal(p.status(), 'Favorites reset to 2 stickers.');

  p.press('Put back: no favorites (clear the 2 now)');
  const ask = p.modals[1];
  assert.equal(ask.title, 'Put back your previous favorites?');
  assert.equal(ask.options.confirmText, 'Clear my favorites');
  assert.equal(ask.options.danger, true);
  assert.match(drawLikeBd(ask.content), /^Your favorite stickers now: 2 stickers\.\nAfter this: no favorite stickers, as before the last reset\.\n0 stickers added, 2 stickers taken off\.\n/);
  assert.deepEqual(discord.value.favoriteStickers.stickerIds, ['21', '11'], 'nothing changes before the confirmation');
  ask.options.onConfirm();
  await settle();
  assert.deepEqual(discord.value.favoriteStickers.stickerIds, []);
  assert.deepEqual(p.data.backup.stickerIds, ['21', '11'], 'and that can be put back in turn');
  assert.equal(p.status(), 'Put back: no favorite stickers, as before the last reset.');
  assert.ok(p.buttons().includes('Put back my previous favorites (2)'));
});

test('panel: Reset with no picks is off and asks nothing', () => {
  const discord = fakeDiscord({ favorites: ['21', '11'] });
  const p = openPanel(discord, { backup: { savedAt: '2026-10-20T02:05:58.618Z', stickerIds: [] } });
  const reset = p.press('Pick stickers to reset your favorites');
  assert.equal(reset.disabled, true);
  assert.equal(p.modals.length, 0);
  assert.deepEqual(discord.value.favoriteStickers.stickerIds, ['21', '11']);
});

test('panel: when Discord does not keep the change, the copy from before stays', async () => {
  const discord = fakeDiscord({ favorites: ['21', '11'], keep: false });
  const p = openPanel(discord, { backup: { savedAt: '2026-10-20T02:05:58.618Z', stickerIds: [] } });
  p.press('Put back: no favorites (clear the 2 now)');
  p.modals[0].options.onConfirm();
  await settle();
  assert.match(p.status(), /did not confirm/);
  assert.deepEqual(p.data.backup, { savedAt: '2026-10-20T02:05:58.618Z', stickerIds: [] });
  assert.ok(p.buttons().includes('Put back: no favorites (clear the 2 now)'), 'still offered');
});
