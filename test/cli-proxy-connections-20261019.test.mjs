// Discord Damsel's two planned connections, Token Toucan and Proxy Axolotl, in her L2 panel. The page's own script
// runs in a small pretend browser, so these tests check what the page draws and what its switches do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = readFileSync(join(root, 'findastra-discord-presence-20261008.html'), 'utf8');
const script = page.match(/<script>(window\.APP_CONFIG=[\s\S]*?)<\/script>/)[1];
const KEY = 'astras-pet-apps:findastra-discord-presence:interface:v1';
// The hub folder next to this repo on Astra's PC (or ASTRAS_PET_OS); the cross-check below skips without it.
const hub = process.env.ASTRAS_PET_OS || join(root, '../astras-pet-os');

const CONNECTIONS = [
  { pet: 'Token Toucan', grant: 'toucan-reads-cli-proxy', label: 'token-canopy-v1.0', number: 52, program: 'Token Canopy', receives: 'Nothing.' },
  { pet: 'Proxy Axolotl', grant: 'axolotl-reads-cli-proxy', label: 'proxy-lake-v1.0', number: 64, program: 'Proxy Lake', receives: 'A finding' },
];

class El {
  // style: the Sticker Manager card sizes its picture with style.cssText (PR #19).
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.style = {}; this.textContent = ''; this.className = ''; }
  append(...kids) { this.children.push(...kids); }
  replaceChildren(...kids) { this.children = kids; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  set innerHTML(_) { throw new Error('the page must put text on screen with textContent, never innerHTML'); }
}
const all = (el) => [el, ...el.children.flatMap(all)];
const text = (el) => el.textContent + el.children.map(text).join('');

function openPage({ saved, answer = true } = {}) {
  const header = new El('header'), main = new El('main'), feedback = new El('p');
  const store = new Map(saved ? [[KEY, JSON.stringify(saved)]] : []), asked = [];
  const window = { confirm: (question) => { asked.push(question); return answer; } };
  const document = { createElement: (tag) => new El(tag), querySelector: (s) => ({ main, header, '#feedback': feedback })[s] };
  const localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const fetch = () => Promise.reject(new Error('no network in tests'));
  new Function('window', 'document', 'localStorage', 'fetch', script)(window, document, localStorage, fetch);
  const panel = all(main).find((e) => e.tagName === 'DETAILS' && e.className === 'panel');
  const boxes = panel ? all(panel).filter((e) => e.tagName === 'FIELDSET' && e.className === 'connection') : [];
  const box = (pet) => boxes.find((b) => text(b.children[0]).endsWith(pet));
  const onoff = (pet) => all(box(pet)).find((e) => e.className === 'switch');
  return { main, panel, boxes, box, onoff, asked, stored: () => JSON.parse(store.get(KEY) || 'null') };
}

test('her L2 panel holds a connection box for Token Toucan and for Proxy Axolotl', () => {
  const p = openPage();
  assert.ok(p.panel, 'the page has a discord-damsel-L2-panel');
  assert.equal(p.panel.open, true);
  assert.equal(text(all(p.panel).find((e) => e.tagName === 'SUMMARY')), 'discord-damsel-L2-panel');
  assert.equal(p.boxes.length, 2);
  for (const c of CONNECTIONS) {
    const box = p.box(c.pet);
    assert.ok(box, `a box titled ${c.pet}`);
    assert.equal(text(box.children[0]).replace(/^(ON|OFF)/, ''), c.pet, 'the title is only the other pet\'s icon name');
    const rows = Object.fromEntries(all(box).filter((e) => e.tagName === 'DT').map((dt, i, dts) => [dt.textContent, all(box).filter((e) => e.tagName === 'DD')[i].textContent]));
    assert.deepEqual(Object.keys(rows), ['Sends', 'Receives', 'Pet program', 'Grant', 'State']);
    assert.match(rows.Sends, /her CLI Proxy API manager reports|Her tool's safety check/);
    assert.ok(rows.Receives.startsWith(c.receives));
    assert.equal(rows['Pet program'], `${c.program} · ${c.label} (#${c.number})`);
    assert.ok(rows.Grant.startsWith(`${c.grant}: read only`));
    assert.match(rows.Grant, /discord-tower-v1\.0-cli-proxy-api-v1\.0/);
    assert.match(rows.Grant, /No write, no run/);
    assert.ok(rows.State.startsWith('planned, not connected'));
  }
  // The panel comes after her tool boxes and the Third Party Programs card.
  const titles = p.main.children.map((e) => (e.tagName === 'DETAILS' ? 'L2' : text(e.children[0] || new El('x'))));
  assert.ok(titles.indexOf('L2') > titles.indexOf('Third Party Programs'));
});

test('each connection\'s ON/OFF starts OFF, asks before ON, turns OFF without asking, and is kept in this browser', () => {
  const p = openPage();
  for (const c of CONNECTIONS) {
    const b = p.onoff(c.pet);
    assert.equal(b.tagName, 'BUTTON');
    assert.equal(b.type, 'button');
    assert.equal(b.textContent, 'OFF');
    assert.equal(b.getAttribute('aria-pressed'), 'false');
    assert.equal(b.getAttribute('aria-label'), `${c.pet} connection: off`);
  }
  p.onoff('Token Toucan').onclick();
  assert.equal(p.asked.length, 1);
  assert.match(p.asked[0], /planned, not connected/);
  assert.match(p.asked[0], /toucan-reads-cli-proxy/);
  assert.equal(p.onoff('Token Toucan').textContent, 'ON');
  assert.equal(p.onoff('Token Toucan').getAttribute('aria-pressed'), 'true');
  assert.equal(p.onoff('Proxy Axolotl').textContent, 'OFF', 'one switch never moves the other');
  assert.deepEqual(p.stored().connections, { 'toucan-reads-cli-proxy': 'on' });
  p.onoff('Token Toucan').onclick();
  assert.equal(p.asked.length, 1, 'turning OFF never asks');
  assert.equal(p.onoff('Token Toucan').textContent, 'OFF');
  assert.deepEqual(p.stored().connections, { 'toucan-reads-cli-proxy': 'off' });

  const declined = openPage({ answer: false });
  declined.onoff('Proxy Axolotl').onclick();
  assert.equal(declined.onoff('Proxy Axolotl').textContent, 'OFF', 'saying no keeps it OFF');
  assert.equal(declined.stored(), null, 'nothing is saved when you say no');

  const again = openPage({ saved: { connections: { 'axolotl-reads-cli-proxy': 'on' } } });
  assert.equal(again.onoff('Proxy Axolotl').textContent, 'ON');
  assert.equal(again.onoff('Token Toucan').textContent, 'OFF');
  assert.equal(openPage({ saved: { notes: 'older save, before connections' } }).onoff('Token Toucan').textContent, 'OFF');
  assert.equal(openPage({ saved: { connections: null } }).onoff('Token Toucan').textContent, 'OFF');
});

test('connection boxes have a border colour of their own, not the tool boxes\' colour', () => {
  const css = page.match(/<style>([\s\S]*?)<\/style>/)[1];
  const connection = css.match(/--connection:(#[0-9a-f]{6})/i)[1];
  const tool = css.match(/\.card\{[^}]*border:1px solid (#[0-9a-f]{6})/i)[1];
  assert.match(css, /\.connection\{[^}]*border:1px dashed var\(--connection\)/);
  assert.match(css, /\.connection legend\{[^}]*color:var\(--connection\)/);
  assert.notEqual(connection.toLowerCase(), tool.toLowerCase());
});

test('no new local addresses: the page names only the ports it already had', () => {
  const ports = [...new Set([...page.matchAll(/127\.0\.0\.1:(\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  assert.deepEqual(ports, [8317, 38761, 38762, 38763]);
  const panel = script.slice(script.indexOf('discord-damsel-L2-panel'), script.indexOf("checklist('Presence checklist'"));
  assert.doesNotMatch(panel, /127\.0\.0\.1|localhost|:\d{4,5}\b/);
});

test('the README lists both connections with their grants', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const section = readme.slice(readme.indexOf('### Connections'), readme.indexOf('## Desktop pet update'));
  for (const c of CONNECTIONS) {
    assert.match(section, new RegExp(`\\[${c.pet}\\]`));
    assert.ok(section.includes(`\`${c.grant}\``));
    assert.ok(section.includes(`\`${c.label}\` (#${c.number})`));
  }
  assert.match(section, /planned, not connected/);
});

test('the boxes match the hub: names from pet-programs.json, planned read-only grants in system-map.json', { skip: !existsSync(join(hub, 'system-map.json')) && 'the astras-pet-os folder is not next to this repo' }, () => {
  const programs = JSON.parse(readFileSync(join(hub, 'pet-programs.json'), 'utf8'));
  const list = Array.isArray(programs) ? programs : Object.values(programs).find(Array.isArray);
  const access = JSON.parse(readFileSync(join(hub, 'system-map.json'), 'utf8')).access;
  const grants = Array.isArray(access) ? access : Object.values(access).find(Array.isArray);
  for (const c of CONNECTIONS) {
    const entry = list.find((p) => p.number === c.number);
    assert.equal(entry.icon, c.pet);
    assert.equal(entry.program, c.program);
    const g = grants.find((x) => x.id === c.grant);
    assert.ok(g, `${c.grant} is in system-map.json`);
    assert.deepEqual([g.r, g.w, g.x, g.status], ['yes', 'no', 'no', 'planned']);
    assert.deepEqual(g.resources, ['id:cli-proxy-api-manager']);
  }
});
