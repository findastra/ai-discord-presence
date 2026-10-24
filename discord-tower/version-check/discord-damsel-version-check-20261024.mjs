// Discord Damsel's version check: is a newer BetterDiscord or Sticker Manager out than the ones on this PC?
// By Astra. Written by Claude Opus 5.5 (claude-opus-5-5), 2026-10-24, at Astra's request. MIT license.
//
// Reads (never changes) the installed versions: BetterDiscord's from its own file
// (%APPDATA%\BetterDiscord\data\betterdiscord.asar) and the Sticker Manager's from the plugins folder. Asks GitHub for
// the newest of each: BetterDiscord's latest release, and the plugin file on this repo's main. No token, no sign-in.
// Writes the answer to %APPDATA%\BetterDiscord\plugins\DiscordDamselVersionCheck.config.json, a file of its own, so it
// never races the plugin's own saves. The plugin (1.0.4 and later) reads it and turns its maintenance light yellow.
import { readFileSync, readdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESULT_NAME = 'DiscordDamselVersionCheck';
export const PLUGIN_NAME = 'DiscordDamselStickerManager';
export const BD_RELEASE = 'https://api.github.com/repos/BetterDiscord/BetterDiscord/releases/latest';
export const PLUGIN_ON_MAIN = 'https://raw.githubusercontent.com/findastra/findastra-discord-presence/main/discord-tower/sticker-manager/discord-damsel-sticker-manager-20261018.plugin.js';

export function paths(env = process.env) {
  const bd = join(env.APPDATA || '', 'BetterDiscord');
  return { asar: join(bd, 'data', 'betterdiscord.asar'), plugins: join(bd, 'plugins') };
}

/** "v1.14.4" and "1.14.4" alike; null for anything that is not a plain version. */
export function clean(version) {
  const m = /^v?(\d+(?:\.\d+){1,3})$/.exec(String(version ?? '').trim());
  return m ? m[1] : null;
}

/** Below 0 when a is older than b. */
export function compare(a, b) {
  const x = clean(a).split('.').map(Number), y = clean(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** BetterDiscord keeps its version in its own code: {branch:"main",commit:"…",build:"…",version:"1.14.3",…}. */
export function bdVersionIn(asarText) {
  const m = /build:"[^"]*",version:"(\d+\.\d+\.\d+)"/.exec(asarText) || /version:"(\d+\.\d+\.\d+)"/.exec(asarText);
  return m ? m[1] : null;
}

/** The @version line of a BetterDiscord plugin's header, and its @name. */
export function pluginHeader(source) {
  const head = String(source).slice(0, 2000);
  return { name: /^\s*\*\s*@name\s+(\S+)/m.exec(head)?.[1] ?? null, version: clean(/^\s*\*\s*@version\s+(\S+)/m.exec(head)?.[1]) };
}

export function installed(p) {
  let betterdiscord = null, plugin = null;
  try { betterdiscord = bdVersionIn(readFileSync(p.asar).toString('latin1')); } catch { betterdiscord = null; }
  try {
    for (const file of readdirSync(p.plugins).filter((f) => f.endsWith('.plugin.js'))) {
      const head = pluginHeader(readFileSync(join(p.plugins, file), 'utf8'));
      if (head.name === PLUGIN_NAME && head.version) { plugin = head.version; break; }
    }
  } catch { plugin = null; }
  return { betterdiscord, plugin };
}

export async function newest(fetchImpl = fetch) {
  const ask = (url, accept) => fetchImpl(url, { headers: { accept, 'user-agent': 'discord-damsel-version-check' }, signal: AbortSignal.timeout(10000) })
    .then((r) => { if (!r.ok) throw new Error(url + ' answered ' + r.status); return r; });
  const out = { betterdiscord: null, plugin: null, errors: [] };
  await Promise.all([
    ask(BD_RELEASE, 'application/vnd.github+json').then((r) => r.json()).then((j) => { out.betterdiscord = clean(j.tag_name); })
      .catch((e) => out.errors.push('BetterDiscord: ' + e.message)),
    ask(PLUGIN_ON_MAIN, 'text/plain').then((r) => r.text()).then((t) => { out.plugin = pluginHeader(t).version; })
      .catch((e) => out.errors.push('Sticker Manager: ' + e.message)),
  ]);
  return out;
}

/** What the plugin reads: each part's installed and newest version, and whether the PC is behind. */
export function result(have, latest, now = new Date()) {
  const part = (a, b) => ({ installed: a, latest: b, behind: Boolean(a && b && compare(a, b) < 0) });
  const betterdiscord = part(have.betterdiscord, latest.betterdiscord), plugin = part(have.plugin, latest.plugin);
  return { checkedAt: now.toISOString(), betterdiscord, plugin, needsMaintenance: betterdiscord.behind || plugin.behind, errors: latest.errors ?? [] };
}

export function lines(r) {
  const say = (name, x, fix) => !x.installed ? name + ': not installed on this PC.'
    : !x.latest ? name + ' ' + x.installed + ': could not ask GitHub for the newest version.'
      : x.behind ? name + ' ' + x.latest + ' is out (this PC has ' + x.installed + '). ' + fix
        : name + ' ' + x.installed + ' is the newest.';
  return [
    say('BetterDiscord', r.betterdiscord, 'In Discord: User Settings > Updates (BetterDiscord) > Update.'),
    say('Sticker Manager', r.plugin, 'Download it again: discord-tower/sticker-manager/README.md, "Install it", step 2.'),
    r.needsMaintenance ? 'The Sticker Manager\'s maintenance light is yellow until then.' : 'Nothing to update.',
  ];
}

/** Writes the answer where BetterDiscord keeps plugin data, only when that folder is there. */
export function save(p, r) {
  if (!existsSync(p.plugins)) return null;
  const file = join(p.plugins, RESULT_NAME + '.config.json');
  writeFileSync(file, JSON.stringify({ result: r }, null, 4) + '\n');
  return file;
}

export async function main(argv = process.argv.slice(2), { env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  const flag = (name) => argv.includes(name);
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const p = { ...paths(env) };
  if (value('--plugins-dir')) p.plugins = value('--plugins-dir');
  if (value('--asar')) p.asar = value('--asar');
  const r = result(installed(p), await newest(fetchImpl));
  const file = flag('--no-write') ? null : save(p, r);
  if (flag('--json')) log(JSON.stringify(r, null, 2));
  else if (!flag('--quiet')) {
    for (const line of lines(r)) log(line);
    if (file) log('Saved for the plugin: ' + file);
  }
  return r;
}

// Run as a program. Compare real paths: through the "Astra's PetOS" junction the two spellings differ.
const real = (f) => { try { return realpathSync(f); } catch { return f; } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  main().catch((error) => { console.error('Version check failed: ' + error.message); process.exitCode = 0; });
}
