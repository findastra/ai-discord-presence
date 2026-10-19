/**
 * @name DiscordDamselStickerManager
 * @author Astra
 * @authorLink https://github.com/findastra
 * @description Discord Damsel's servers panel: every server you are in, each opening to show its stickers, with the Sticker Manager inside it to reset your favorite stickers to the ones you pick.
 * @version 1.0.1
 * @website https://github.com/findastra/findastra-discord-presence/tree/main/discord-tower/sticker-manager
 * @source https://github.com/findastra/findastra-discord-presence/blob/main/discord-tower/sticker-manager/discord-damsel-sticker-manager-20261018.plugin.js
 */
/*
 * By Astra. Discord Damsel (Discord Tower, pet program #13 in Astra's PetOS).
 * Panel discord-damsel-servers-panel with the tool discord-tower-v1.0-sticker-manager-v1.0.
 * Written by Claude Opus 5.5 (claude-opus-5-5), 2026-10-18, at Astra's request. MIT license.
 *
 * What it touches: it reads Discord's own lists of your servers, their stickers and your favorite stickers, which the
 * Discord app already holds in memory. It changes one thing, your favorite stickers, and only after you confirm, the
 * same way Discord saves them when you click the star. No network requests of its own, no token, no other settings.
 * Server and sticker names are shown with textContent, never as HTML.
 */
'use strict';

const NAME = 'DiscordDamselStickerManager';
const TOOL = 'discord-tower-v1.0-sticker-manager-v1.0';
const PANEL = 'discord-damsel-servers-panel';
const STYLE_ID = 'discord-damsel-sticker-manager';
// Discord sticker formats: 1 PNG, 2 APNG, 3 Lottie (Discord's own packs only, no picture file), 4 GIF.
const FORMAT_EXT = { 1: 'png', 2: 'png', 4: 'gif' };

/* Plain helpers: no Discord and no page. test/sticker-manager-20261018.test.mjs checks them. */
const Core = {
  /** Sticker IDs as strings, in order, without repeats or anything that is not an ID. */
  ids(list) {
    const seen = new Set(), out = [];
    for (const item of list || []) {
      const id = String(item);
      if (/^\d{1,25}$/.test(id) && !seen.has(id)) { seen.add(id); out.push(id); }
    }
    return out;
  },

  sticker(raw, guildId) {
    if (!raw || raw.id == null || !/^\d{1,25}$/.test(String(raw.id))) return null;
    return {
      id: String(raw.id),
      name: String(raw.name ?? 'sticker'),
      tags: String(raw.tags ?? ''),
      description: String(raw.description ?? ''),
      format: Number(raw.format_type ?? raw.formatType ?? 1),
      available: raw.available !== false,
      guildId: String(raw.guild_id ?? raw.guildId ?? guildId ?? ''),
    };
  },

  /**
   * Every server, in the order of the server list on the left of Discord (folders opened out), then any the order
   * does not mention, by name. stickersFor(id) returns that server's stickers, or undefined when Discord has not
   * loaded them.
   */
  collectServers(guilds, order, stickersFor) {
    const byId = new Map();
    for (const guild of guilds || []) if (guild && guild.id != null) byId.set(String(guild.id), guild);
    const name = (guild) => String(guild?.name ?? 'Unnamed server');
    const ids = [], placed = new Set();
    for (const raw of order || []) {
      const id = String(raw);
      if (byId.has(id) && !placed.has(id)) { placed.add(id); ids.push(id); }
    }
    const rest = [...byId.keys()].filter((id) => !placed.has(id)).sort((a, b) => name(byId.get(a)).localeCompare(name(byId.get(b))));
    return [...ids, ...rest].map((id) => {
      const guild = byId.get(id), raw = stickersFor(id);
      const stickers = (Array.isArray(raw) ? raw : []).map((s) => Core.sticker(s, id)).filter(Boolean);
      return { id, name: name(guild), icon: typeof guild.icon === 'string' ? guild.icon : null, loaded: Array.isArray(raw), stickers };
    });
  },

  /** Servers that match the search: by server name (all its stickers), or by sticker name, tags or description. */
  filter(servers, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return servers.map((server) => ({ server, stickers: server.stickers, serverMatch: false }));
    const out = [];
    for (const server of servers) {
      const serverMatch = server.name.toLowerCase().includes(q);
      const stickers = serverMatch ? server.stickers
        : server.stickers.filter((s) => (s.name + ' ' + s.tags + ' ' + s.description).toLowerCase().includes(q));
      if (serverMatch || stickers.length) out.push({ server, stickers, serverMatch });
    }
    return out;
  },

  /** What a reset changes: the favorites now, the new list, and which stickers are added or taken off. */
  plan(current, picked) {
    const now = Core.ids(current), next = Core.ids(picked);
    const nowSet = new Set(now), nextSet = new Set(next);
    return {
      now, next,
      added: next.filter((id) => !nowSet.has(id)),
      removed: now.filter((id) => !nextSet.has(id)),
      same: now.length === next.length && now.every((id, i) => id === next[i]),
    };
  },

  togglePick(picks, id) {
    const list = Core.ids(picks), key = String(id);
    return list.includes(key) ? list.filter((x) => x !== key) : [...list, key];
  },

  /** Discord's media server for a sticker picture, or null for Lottie stickers, which have no picture file. */
  stickerUrl(sticker, size = 160, media = 'https://media.discordapp.net') {
    const ext = FORMAT_EXT[sticker.format];
    if (!ext || !/^\d{1,25}$/.test(sticker.id)) return null;
    return `${media}/stickers/${sticker.id}.${ext}?size=${size}`;
  },

  iconUrl(server, size = 64) {
    if (!server.icon || !/^(a_)?[0-9a-f]{32}$/.test(server.icon) || !/^\d{1,25}$/.test(server.id)) return null;
    return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.${server.icon.startsWith('a_') ? 'gif' : 'png'}?size=${size}`;
  },

  initials(name) {
    return String(name).split(/\s+/).filter(Boolean).slice(0, 3).map((w) => [...w][0]).join('') || '?';
  },

  count(n, one, many = one + 's') { return n + ' ' + (n === 1 ? one : many); },
};

/** The media server Discord itself uses (GLOBAL_ENV), when it is a plain host; otherwise Discord's public one. */
function mediaBase() {
  const raw = globalThis.GLOBAL_ENV?.MEDIA_PROXY_ENDPOINT;
  if (typeof raw === 'string' && /^(https:)?\/\/[a-z0-9.-]+$/i.test(raw)) return raw.startsWith('//') ? 'https:' + raw : raw;
  return 'https://media.discordapp.net';
}

/* Discord's own modules, found the way other client mods find them. Anything missing is reported, never guessed. */
function findDiscord(api) {
  const W = api.Webpack;
  const store = (name) => { try { return W.getStore(name) || null; } catch { return null; } };
  const find = (filter) => {
    try { return W.getModule((m) => { try { return filter(m); } catch { return false; } }, { searchExports: true }) || null; }
    catch { return null; }
  };
  const frecency = find((m) => typeof m?.ProtoClass?.typeName === 'string' && m.ProtoClass.typeName.endsWith('.FrecencyUserSettings'));
  const delays = find((m) => m && typeof m === 'object' && typeof m.INFREQUENT_USER_ACTION === 'number');
  return {
    guilds: store('GuildStore'),
    sorted: store('SortedGuildStore'),
    stickers: store('StickersStore'),
    proto: store('UserSettingsProtoStore'),
    frecency,
    delay: delays?.INFREQUENT_USER_ACTION ?? 0,
  };
}

function readServers(d) {
  const G = d.guilds;
  if (!G) throw new Error("Could not find Discord's server list (GuildStore). Discord may have changed; the plugin needs an update.");
  const guilds = typeof G.getGuildsArray === 'function' ? G.getGuildsArray() : Object.values(G.getGuilds?.() ?? {});
  let order = [];
  try { order = d.sorted?.getFlattenedGuildIds?.() ?? []; } catch { order = []; }
  if (!order.length) {
    try { order = (d.sorted?.getGuildFolders?.() ?? []).flatMap((folder) => folder?.guildIds ?? []); } catch { order = []; }
  }
  const S = d.stickers;
  let all = null;
  try { all = S?.getAllGuildStickers?.() ?? S?.getRawStickersByGuild?.() ?? null; } catch { all = null; }
  const stickersFor = (id) => {
    try { const list = S?.getStickersByGuildId?.(id); if (Array.isArray(list)) return list; } catch { /* use the map */ }
    const list = typeof all?.get === 'function' ? all.get(id) : undefined;
    return Array.isArray(list) ? list : undefined;
  };
  return Core.collectServers(guilds, order, stickersFor);
}

function readFavorites(d) {
  let value = null;
  try { value = d.frecency?.getCurrentValue?.()?.favoriteStickers ?? null; } catch { value = null; }
  if (!value) { try { value = d.proto?.frecencyWithoutFetchingLatest?.favoriteStickers ?? null; } catch { value = null; } }
  return Core.ids(value?.stickerIds ?? []);
}

/** Replaces the favorite stickers with `ids`, through Discord's own settings saver, then reads them back. */
async function saveFavorites(d, ids) {
  if (typeof d.frecency?.updateAsync !== 'function') {
    throw new Error("Could not find Discord's favorites saver (FrecencyUserSettings). Discord may have changed; the plugin needs an update. Nothing was changed.");
  }
  const next = Core.ids(ids);
  let handed = false;
  await d.frecency.updateAsync('favoriteStickers', (proto) => {
    if (!proto || typeof proto !== 'object') return false;
    handed = true;
    const sample = Array.isArray(proto.stickerIds) ? proto.stickerIds[0] : undefined;
    proto.stickerIds = next.map((id) => (typeof sample === 'bigint' ? BigInt(id) : id));
  }, d.delay);
  if (!handed) {
    throw new Error('Discord did not hand over your favorites list. Favorite one sticker by hand (the star in the sticker picker), then try again. Nothing was changed.');
  }
  const after = readFavorites(d);
  if (!Core.plan(after, next).same) throw new Error('Discord did not confirm the new favorites. Open the sticker picker to see what it kept.');
  return after;
}

const CSS = `
.ddsm{--ddsm-accent:#bcb9ff;--ddsm-line:color-mix(in srgb,var(--ddsm-accent) 45%,transparent);--ddsm-text:var(--text-default,var(--text-normal,#e8e6f0));--ddsm-muted:var(--text-muted,#a9a3b8);--ddsm-panel:var(--background-secondary,#23212c);--ddsm-deep:var(--background-tertiary,#17161d);color:var(--ddsm-text);font-size:14px;line-height:1.45}
.ddsm *{box-sizing:border-box}
.ddsm fieldset{border:1px solid var(--ddsm-line);border-radius:12px;margin:0;padding:12px 14px 14px;min-width:0}
.ddsm legend{padding:0 6px;font:600 12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--ddsm-accent);display:flex;align-items:center;gap:6px}
.ddsm p{margin:4px 0 8px}
.ddsm .ddsm-muted{color:var(--ddsm-muted)}
.ddsm button{font:inherit;color:inherit;cursor:pointer}
.ddsm button:focus-visible,.ddsm input:focus-visible,.ddsm summary:focus-visible{outline:2px solid var(--ddsm-accent);outline-offset:2px}
.ddsm .ddsm-btn{border:1px solid var(--ddsm-accent);background:transparent;color:var(--ddsm-accent);border-radius:8px;padding:5px 11px;margin:3px 6px 3px 0}
.ddsm .ddsm-btn.ddsm-primary{background:var(--ddsm-accent);color:#17161d;font-weight:600}
.ddsm .ddsm-btn:disabled{opacity:.45;cursor:not-allowed}
.ddsm .ddsm-light{width:14px;height:14px;border-radius:50%;border:1px solid #0008;padding:0;margin:0}
.ddsm .ddsm-light.ddsm-on{background:#43b581}.ddsm .ddsm-light.ddsm-off{background:#ed4245}
.ddsm .ddsm-light.ddsm-ok{background:#5b8def}.ddsm .ddsm-light.ddsm-fix{background:#f0c94a}
.ddsm .ddsm-pin{position:sticky;top:0;z-index:2;padding:10px 0 12px;margin:0 -2px;background:var(--modal-background,var(--background-primary,#313338))}
.ddsm .ddsm-tool{background:var(--ddsm-panel);margin:0 2px;box-shadow:0 6px 12px -8px #000a}
.ddsm .ddsm-tool .ddsm-status{margin:6px 0 0}
.ddsm .ddsm-tool .ddsm-status:empty{display:none}
.ddsm .ddsm-tool.ddsm-is-off{border-style:dashed}
.ddsm .ddsm-row{display:flex;align-items:center;gap:8px;margin:6px 0;min-height:40px}
.ddsm .ddsm-row>span:first-child{flex:0 0 118px;color:var(--ddsm-muted);font-size:12px}
.ddsm .ddsm-strip{display:flex;gap:4px;overflow-x:auto;padding:2px 0;flex:1;min-width:0}
.ddsm .ddsm-mini{flex:0 0 auto;width:38px;height:38px;border-radius:6px;background:var(--ddsm-deep);border:1px solid transparent;padding:2px;position:relative;display:grid;place-items:center;font-size:9px;overflow:hidden}
.ddsm .ddsm-mini img{width:100%;height:100%;object-fit:contain}
.ddsm button.ddsm-mini:hover{border-color:#ed4245}
.ddsm .ddsm-empty{color:var(--ddsm-muted);font-size:12px}
.ddsm .ddsm-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 10px}
.ddsm .ddsm-toolbar input{flex:1 1 220px;min-width:0;background:var(--ddsm-deep);color:var(--ddsm-text);border:1px solid var(--ddsm-line);border-radius:8px;padding:7px 10px;font:inherit}
.ddsm .ddsm-status{min-height:1.4em;color:var(--ddsm-accent);font-size:13px}
.ddsm details.ddsm-server{border:1px solid #ffffff14;border-radius:10px;margin:6px 0;background:var(--ddsm-panel)}
.ddsm details.ddsm-server[open]{border-color:var(--ddsm-line)}
.ddsm summary{display:flex;align-items:center;gap:10px;padding:7px 10px;cursor:pointer;list-style:none}
.ddsm summary::-webkit-details-marker{display:none}
.ddsm summary::before{content:"▸";color:var(--ddsm-accent);width:10px}
.ddsm details[open]>summary::before{content:"▾"}
.ddsm .ddsm-icon{width:30px;height:30px;border-radius:50%;flex:0 0 30px;object-fit:cover;background:var(--ddsm-deep);display:grid;place-items:center;font-size:11px;font-weight:600}
.ddsm .ddsm-sname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.ddsm .ddsm-pill{font-size:11px;color:var(--ddsm-muted);white-space:nowrap}
.ddsm .ddsm-pill.ddsm-hot{color:#17161d;background:var(--ddsm-accent);border-radius:999px;padding:1px 7px}
.ddsm .ddsm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;padding:4px 10px 12px}
.ddsm .ddsm-sticker{position:relative;display:grid;grid-template-rows:72px auto;gap:4px;align-items:center;justify-items:center;padding:6px 4px;border-radius:9px;border:2px solid transparent;background:var(--ddsm-deep);min-width:0}
.ddsm .ddsm-sticker img{width:72px;height:72px;object-fit:contain}
.ddsm .ddsm-sticker[aria-pressed="true"]{border-color:var(--ddsm-accent);background:color-mix(in srgb,var(--ddsm-accent) 16%,var(--ddsm-deep))}
.ddsm .ddsm-sticker.ddsm-unavailable{opacity:.5}
.ddsm .ddsm-sticker:disabled{cursor:default}
.ddsm .ddsm-sticker .ddsm-label{font-size:11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ddsm .ddsm-mark{position:absolute;top:3px;font-size:11px;line-height:1;padding:2px 4px;border-radius:6px;background:#000a}
.ddsm .ddsm-mark.ddsm-fav{left:3px;color:#f0c94a}
.ddsm .ddsm-mark.ddsm-pick{right:3px;color:var(--ddsm-accent)}
.ddsm .ddsm-lottie{width:72px;height:72px;display:grid;place-items:center;font-size:10px;color:var(--ddsm-muted);text-align:center}
.ddsm .ddsm-note{font-size:12px;color:var(--ddsm-muted);padding:0 12px 10px}
`;

module.exports = class DiscordDamselStickerManager {
  static Core = Core;
  static internals = { findDiscord, readServers, readFavorites, saveFavorites, mediaBase };

  constructor(meta) {
    this.meta = meta;
    this.api = globalThis.BdApi;
  }

  start() { this.api.DOM.addStyle(STYLE_ID, CSS); }
  stop() { this.api.DOM.removeStyle(STYLE_ID); }

  load(key, fallback) {
    try { const value = this.api.Data.load(NAME, key); return value === undefined || value === null ? fallback : value; } catch { return fallback; }
  }
  store(key, value) { try { this.api.Data.save(NAME, key, value); } catch { /* the panel still works without saving */ } }

  getSettingsPanel() {
    const panel = new Panel(this);
    return panel.root;
  }
};

/** The settings panel BetterDiscord shows for this plugin: the servers panel with the Sticker Manager inside. */
class Panel {
  constructor(plugin) {
    this.plugin = plugin;
    this.api = plugin.api;
    this.settings = { toolOn: true, maintenance: false, ...plugin.load('settings', {}) };
    this.picks = Core.ids(plugin.load('picks', []));
    this.query = '';
    this.tiles = new Map();      // sticker id -> tile buttons on screen
    this.summaries = new Map();  // server id -> its "picked" pill
    this.root = el('div', { class: 'ddsm' });
    this.reload();
  }

  reload() {
    this.d = findDiscord(this.api);
    this.media = mediaBase();
    this.error = '';
    try { this.servers = readServers(this.d); } catch (error) { this.servers = []; this.error = error.message; }
    this.favorites = readFavorites(this.d);
    this.index = new Map();
    for (const server of this.servers) for (const s of server.stickers) this.index.set(s.id, { ...s, serverName: server.name });
    this.render();
  }

  stickerInfo(id) {
    const known = this.index.get(id);
    if (known) return known;
    let raw = null;
    try { raw = this.d.stickers?.getStickerById?.(id) ?? null; } catch { raw = null; }
    const s = Core.sticker(raw, raw?.guild_id) || { id, name: 'Sticker ' + id, tags: '', description: '', format: 1, available: true, guildId: '' };
    return { ...s, serverName: raw ? '' : 'a server you are not in' };
  }

  say(text) { if (this.status) this.status.textContent = text; }

  render() {
    this.tiles.clear();
    this.summaries.clear();
    const stickerTotal = this.servers.reduce((n, s) => n + s.stickers.length, 0);
    const panel = el('fieldset', { class: 'ddsm-panel' }, el('legend', {}, PANEL));
    panel.append(el('p', {}, this.error ? 'Discord Damsel could not read your servers.'
      : 'Every server you are in: ' + Core.count(this.servers.length, 'server') + ', ' + Core.count(stickerTotal, 'sticker') +
        '. Click a server to see its stickers; click it again to close it.'));
    panel.append(el('div', { class: 'ddsm-pin' }, this.renderTool()));

    const search = el('input', { type: 'search', placeholder: 'Find a server or sticker', 'aria-label': 'Find a server or sticker' });
    search.value = this.query;
    search.addEventListener('input', () => { this.query = search.value; this.renderList(); });
    panel.append(el('div', { class: 'ddsm-toolbar' }, search,
      button('Close all', () => { for (const d of this.list.querySelectorAll('details[open]')) d.open = false; }),
      button('Reload', () => { this.reload(); this.say('Reloaded from Discord.'); })));

    this.list = el('div', { class: 'ddsm-list' });
    panel.append(this.list);
    this.root.replaceChildren(panel);
    this.renderList();
  }

  renderTool() {
    const on = this.settings.toolOn;
    const lightOn = el('button', { type: 'button', class: 'ddsm-light ' + (on ? 'ddsm-on' : 'ddsm-off'), 'aria-pressed': String(on),
      'aria-label': TOOL + ': ' + (on ? 'on' : 'off'), title: (on ? 'ON' : 'OFF') + ': click to turn the Sticker Manager ' + (on ? 'off' : 'on') });
    lightOn.addEventListener('click', () => { this.setSetting('toolOn', !this.settings.toolOn); });
    const fix = this.settings.maintenance;
    const lightFix = el('button', { type: 'button', class: 'ddsm-light ' + (fix ? 'ddsm-fix' : 'ddsm-ok'), 'aria-pressed': String(fix),
      'aria-label': TOOL + ': ' + (fix ? 'requires maintenance' : 'working correctly'),
      title: (fix ? 'Marked as requiring maintenance' : 'Working correctly') + '. Kept in this plugin only; it does not reach the Farmer yet.' });
    lightFix.addEventListener('click', () => { this.setSetting('maintenance', !this.settings.maintenance); });

    const tool = el('fieldset', { class: 'ddsm-tool' + (on ? '' : ' ddsm-is-off') }, el('legend', {}, lightOn, lightFix, TOOL));
    tool.append(el('p', {}, 'Sticker Manager: pick stickers from any server below, then reset your favorite stickers to exactly the ones you picked, in that order.'));
    this.favStrip = el('div', { class: 'ddsm-strip' });
    this.pickStrip = el('div', { class: 'ddsm-strip' });
    this.favLabel = el('span');
    this.pickLabel = el('span');
    tool.append(el('div', { class: 'ddsm-row' }, this.favLabel, this.favStrip), el('div', { class: 'ddsm-row' }, this.pickLabel, this.pickStrip));
    this.actions = el('div');
    tool.append(this.actions);
    if (!on) tool.append(el('p', { class: 'ddsm-muted' }, 'The Sticker Manager is OFF. The server list still works; picking and resetting are switched off.'));
    // The status line lives in the tool box, which stays on screen while the list scrolls.
    this.status = el('p', { class: 'ddsm-status', role: 'status', 'aria-live': 'polite' }, this.error);
    tool.append(this.status);
    this.renderTrays();
    return tool;
  }

  setSetting(key, value) {
    this.settings = { ...this.settings, [key]: value };
    this.plugin.store('settings', this.settings);
    this.render();
    this.say(key === 'toolOn' ? 'Sticker Manager is ' + (value ? 'ON.' : 'OFF.') : value ? 'Marked as requiring maintenance (in this plugin only).' : 'Marked as working correctly.');
  }

  renderTrays() {
    const on = this.settings.toolOn;
    this.favLabel.textContent = 'Favorites now (' + this.favorites.length + ')';
    this.pickLabel.textContent = 'Picked (' + this.picks.length + ')';
    this.favStrip.replaceChildren(...(this.favorites.length ? this.favorites.map((id) => this.mini(id, false))
      : [el('span', { class: 'ddsm-empty' }, 'No favorite stickers yet.')]));
    this.pickStrip.replaceChildren(...(this.picks.length ? this.picks.map((id) => this.mini(id, on))
      : [el('span', { class: 'ddsm-empty' }, on ? 'Nothing picked. Open a server and click stickers to pick them.' : 'Nothing picked.')]));

    const plan = Core.plan(this.favorites, this.picks);
    const backup = this.plugin.load('backup', null);
    const backupIds = Core.ids(backup?.stickerIds ?? []);
    const reset = button(plan.next.length ? 'Reset my favorites to these ' + plan.next.length : 'Pick stickers to reset your favorites', () => this.confirmReset(this.picks, 'reset'), 'ddsm-primary');
    reset.disabled = !on || !plan.next.length || plan.same;
    if (plan.same && plan.next.length) reset.textContent = 'Your favorites are already these ' + plan.next.length;
    const fromFavorites = button('Start from my favorites', () => { this.setPicks(this.favorites); this.say('Picked your ' + Core.count(this.favorites.length, 'favorite') + '. Click any to take it off.'); });
    fromFavorites.disabled = !on || !this.favorites.length;
    const clear = button('Clear picks', () => { this.setPicks([]); this.say('Picks cleared. Your favorites are unchanged.'); });
    clear.disabled = !on || !this.picks.length;
    const children = [reset, fromFavorites, clear];
    if (backupIds.length && !Core.plan(this.favorites, backupIds).same) {
      const undo = button('Put back my previous favorites (' + backupIds.length + ')', () => this.confirmReset(backupIds, 'undo'));
      undo.disabled = !on;
      undo.title = 'Saved ' + String(backup.savedAt || '').slice(0, 16).replace('T', ' ') + ', before the last reset';
      children.push(undo);
    }
    this.actions.replaceChildren(...children);
  }

  mini(id, removable) {
    const s = this.stickerInfo(id);
    const url = Core.stickerUrl(s, 80, this.media);
    const inner = url ? el('img', { src: url, alt: s.name, loading: 'lazy' }) : el('span', {}, s.name);
    const label = s.name + (s.serverName ? ' · ' + s.serverName : '');
    if (!removable) return el('span', { class: 'ddsm-mini', title: label }, inner);
    const b = el('button', { type: 'button', class: 'ddsm-mini', title: label + ' (click to take it off)', 'aria-label': 'Take ' + s.name + ' off the picks' }, inner);
    b.addEventListener('click', () => this.setPicks(this.picks.filter((x) => x !== id)));
    return b;
  }

  setPicks(ids) {
    this.picks = Core.ids(ids);
    this.plugin.store('picks', this.picks);
    this.renderTrays();
    this.refreshMarks();
  }

  renderList() {
    this.tiles.clear();
    this.summaries.clear();
    const shown = Core.filter(this.servers, this.query);
    const rows = shown.map(({ server, stickers, serverMatch }) => this.serverRow(server, stickers, serverMatch));
    if (this.error) return this.list.replaceChildren();
    if (!this.servers.length) rows.push(el('p', { class: 'ddsm-empty' }, 'Discord has not listed any servers yet. Wait for it to finish loading, then click Reload.'));
    else if (!rows.length) rows.push(el('p', { class: 'ddsm-empty' }, 'No server or sticker matches "' + this.query.trim() + '".'));
    this.list.replaceChildren(...rows);
  }

  serverRow(server, stickers, serverMatch) {
    const details = el('details', { class: 'ddsm-server' });
    const iconUrl = Core.iconUrl(server);
    const icon = iconUrl ? el('img', { class: 'ddsm-icon', src: iconUrl, alt: '', loading: 'lazy' }) : el('span', { class: 'ddsm-icon', 'aria-hidden': 'true' }, Core.initials(server.name));
    const filtered = this.query.trim() && !serverMatch;
    const count = !server.loaded ? 'stickers not loaded'
      : filtered ? stickers.length + ' of ' + Core.count(server.stickers.length, 'sticker') + ' match'
        : server.stickers.length ? Core.count(server.stickers.length, 'sticker') : 'no stickers';
    const picked = el('span', { class: 'ddsm-pill ddsm-hot' });
    this.summaries.set(server.id, { pill: picked, server });
    details.append(el('summary', {}, icon, el('span', { class: 'ddsm-sname', title: server.name }, server.name), el('span', { class: 'ddsm-pill' }, count), picked));
    this.updatePill(server.id);
    let drawn = false;
    details.addEventListener('toggle', () => {
      if (!details.open || drawn) return;
      drawn = true;
      details.append(this.grid(server, stickers));
    });
    return details;
  }

  grid(server, stickers) {
    if (!server.loaded) return el('p', { class: 'ddsm-note' }, 'Discord has not loaded this server\'s stickers. Open the server in Discord once, then click Reload.');
    if (!stickers.length) return el('p', { class: 'ddsm-note' }, 'This server has no stickers.');
    const grid = el('div', { class: 'ddsm-grid' });
    for (const s of stickers) grid.append(this.tile(s));
    return grid;
  }

  tile(s) {
    const url = Core.stickerUrl(s, 160, this.media);
    const tile = el('button', { type: 'button', class: 'ddsm-sticker' + (s.available ? '' : ' ddsm-unavailable') },
      url ? el('img', { src: url, alt: '', loading: 'lazy' }) : el('span', { class: 'ddsm-lottie' }, 'animated sticker (no preview)'),
      el('span', { class: 'ddsm-label' }, s.name));
    tile.title = s.name + (s.tags ? ' · ' + s.tags : '') + (s.available ? '' : ' · not usable right now (the server lost the boost level for it)');
    tile.addEventListener('click', () => {
      if (!this.settings.toolOn) { this.say('The Sticker Manager is OFF. Turn it on with its green and red light to pick stickers.'); return; }
      this.setPicks(Core.togglePick(this.picks, s.id));
    });
    if (!this.tiles.has(s.id)) this.tiles.set(s.id, []);
    this.tiles.get(s.id).push({ tile, sticker: s });
    this.mark(tile, s);
    return tile;
  }

  mark(tile, s) {
    const at = this.picks.indexOf(s.id), fav = this.favorites.includes(s.id);
    tile.setAttribute('aria-pressed', String(at >= 0));
    tile.setAttribute('aria-label', s.name + (fav ? ', a favorite now' : '') + (at >= 0 ? ', picked ' + (at + 1) : ''));
    for (const old of tile.querySelectorAll('.ddsm-mark')) old.remove();
    if (fav) tile.append(el('span', { class: 'ddsm-mark ddsm-fav', 'aria-hidden': 'true' }, '★'));
    if (at >= 0) tile.append(el('span', { class: 'ddsm-mark ddsm-pick', 'aria-hidden': 'true' }, '✓' + (at + 1)));
  }

  updatePill(serverId) {
    const entry = this.summaries.get(serverId);
    if (!entry) return;
    const ids = new Set(entry.server.stickers.map((s) => s.id));
    const n = this.picks.filter((id) => ids.has(id)).length;
    entry.pill.textContent = n ? n + ' picked' : '';
    entry.pill.hidden = !n;
  }

  refreshMarks() {
    for (const list of this.tiles.values()) for (const { tile, sticker } of list) this.mark(tile, sticker);
    for (const id of this.summaries.keys()) this.updatePill(id);
  }

  confirmReset(ids, kind) {
    const plan = Core.plan(this.favorites, ids);
    if (!this.settings.toolOn || !plan.next.length || plan.same) return;
    const lines = [
      'Your favorite stickers now: ' + Core.count(plan.now.length, 'sticker') + '.',
      'After this: ' + Core.count(plan.next.length, 'sticker') + ', in the order shown' + (kind === 'undo' ? ' (your list from before the last reset).' : ' (your picks).'),
      Core.count(plan.added.length, 'sticker') + ' added, ' + Core.count(plan.removed.length, 'sticker') + ' taken off.',
      'Discord saves this to your account, so every device sees it. The plugin keeps a copy of the current list so you can put it back.',
    ];
    this.api.UI.showConfirmationModal(kind === 'undo' ? 'Put back your previous favorites?' : 'Reset your favorite stickers?', lines, {
      confirmText: kind === 'undo' ? 'Put them back' : 'Reset favorites',
      cancelText: 'Cancel',
      onConfirm: () => { this.reset(plan, kind); },
    });
  }

  async reset(plan, kind) {
    this.say('Saving your favorites…');
    const before = readFavorites(this.d);
    this.plugin.store('backup', { savedAt: new Date().toISOString(), stickerIds: before });
    try {
      this.favorites = await saveFavorites(this.d, plan.next);
      if (kind === 'reset') this.setPicks([]);
      this.renderTrays();
      this.refreshMarks();
      const done = (kind === 'undo' ? 'Put back ' : 'Favorites reset to ') + Core.count(this.favorites.length, 'sticker') + '.';
      this.say(done);
      try { this.api.UI.showToast(done, { type: 'success' }); } catch { /* the status line says it */ }
    } catch (error) {
      this.favorites = readFavorites(this.d);
      this.renderTrays();
      this.refreshMarks();
      this.say(error.message);
      try { this.api.UI.showToast(error.message, { type: 'error' }); } catch { /* the status line says it */ }
    }
  }
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child !== null && child !== undefined) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

function button(text, onClick, extra = '') {
  const b = el('button', { type: 'button', class: 'ddsm-btn' + (extra ? ' ' + extra : '') }, text);
  b.addEventListener('click', onClick);
  return b;
}
