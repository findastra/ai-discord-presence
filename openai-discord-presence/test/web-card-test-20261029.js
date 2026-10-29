import test from 'node:test';
import assert from 'node:assert/strict';
import { WebCard, webCard, validGist, WEB_CARD_MS, WEB_CARD_HEARTBEAT_MS } from '../src/web-card-20261029.js';

const GIST = 'ac8f1fed8d511b51096187a7ec71edc1';
const card = (details) => ({ type: 0, name: 'Card', details, state: 'Working on Moodglass', timestamps: { start: 100 }, assets: { large_image: 'x' } });
const fake = (status = 200) => {
  const calls = [];
  return { calls, fetchImpl: async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: status < 300, status }; }, token: async () => 't0ken' };
};

test('the website card carries only what Discord shows', () => {
  assert.deepEqual(webCard(card('Using X'), 5), { active: true, name: 'Card', details: 'Using X', state: 'Working on Moodglass', startedAt: 100, updatedAt: 5 });
  assert.deepEqual(webCard(null, 5), { active: false, updatedAt: 5 });
});

test('only a gist id turns it on', () => {
  assert.equal(validGist(GIST.toUpperCase()), GIST);
  assert.equal(validGist(''), '');
  assert.equal(validGist('../gists'), '');
});

test('writes on a change, at most every 30 seconds, and again every 5 minutes while live', async () => {
  const f = fake(); const w = new WebCard('card.json', f);
  assert.equal(await w.push('', card('a'), 0), false);
  assert.equal(await w.push(GIST, card('a'), 0), true);
  assert.equal(f.calls[0].url, 'https://api.github.com/gists/' + GIST);
  assert.equal(f.calls[0].init.method, 'PATCH');
  assert.equal(JSON.parse(f.calls[0].body.files['card.json'].content).details, 'a');
  assert.equal(await w.push(GIST, card('b'), WEB_CARD_MS - 1), false);
  assert.equal(await w.push(GIST, card('b'), WEB_CARD_MS), true);
  assert.equal(await w.push(GIST, card('b'), WEB_CARD_MS * 2), false);
  assert.equal(await w.push(GIST, card('b'), WEB_CARD_MS + WEB_CARD_HEARTBEAT_MS), true);
  assert.equal(await w.push(GIST, null, WEB_CARD_MS * 20, false), true);
  assert.equal(await w.push(GIST, null, WEB_CARD_MS * 20 + WEB_CARD_HEARTBEAT_MS * 2), false);
  assert.equal(await w.push(GIST, null, WEB_CARD_MS * 20 + 1, true), true);
});

test('a refused write is reported and tried again later', async () => {
  const f = fake(500); const w = new WebCard('card.json', f);
  assert.equal(await w.push(GIST, card('a'), 0), false);
  assert.match(w.error, /500/);
  assert.equal(await w.push(GIST, card('a'), WEB_CARD_MS), false);
  assert.equal(f.calls.length, 2);
});
