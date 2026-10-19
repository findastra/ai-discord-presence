// Guards the Ask Astra bot's rules (discord-tower/ask-astra-bot/rules-20261017.mjs). No Discord or Anthropic calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOOL, DEFAULTS, TOKEN_VAR, KEY_VAR, settingsDir, ensureBotSettings, problems, shouldAnswer, cleanQuestion,
  createLimiter, limitMessage, systemPrompt, buildRequest, replyText, splitReply,
} from '../discord-tower/ask-astra-bot/rules-20261017.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const CHANNEL = '123456789012345678';
const ready = { ...DEFAULTS, on: true, channel_id: CHANNEL };
const env = { [TOKEN_VAR]: 'x', [KEY_VAR]: 'sk-ant-test' };

test('the bot adds itself OFF to the shared settings file and keeps the updaters\' entries', () => {
  const dir = settingsDir({ LOCALAPPDATA: mkdtempSync(join(tmpdir(), 'askastra-')) });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ schema: 1, tools: { 'press-plai-agents-file-updater': { on: true, webhook: 'kept' } } }));
  const { bot } = ensureBotSettings(dir);
  assert.equal(bot.on, false);
  const saved = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'));
  assert.equal(saved.tools['press-plai-agents-file-updater'].webhook, 'kept');
  assert.deepEqual(saved.tools[TOOL], DEFAULTS);
  saved.tools[TOOL].model = 'claude-sonnet-5-5';
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(saved));
  assert.equal(ensureBotSettings(dir).bot.model, 'claude-sonnet-5-5', 'Astra\'s choices are kept');
});

test('it will not start until it is ON, has a channel and both secrets, and says why without echoing them', () => {
  assert.equal(problems(DEFAULTS, {}).length, 4);
  assert.deepEqual(problems(ready, env), []);
  const bad = problems(ready, { [TOKEN_VAR]: 'x', [KEY_VAR]: 'not-a-key-1234' });
  assert.equal(bad.length, 1);
  assert.ok(!bad[0].includes('not-a-key-1234'));
  assert.equal(problems({ ...ready, effort: 'huge', per_day: 0 }, env).length, 2);
});

test('the key has its own variable name, so Claude Code on this PC stays on Astra\'s plan', () => {
  assert.notEqual(KEY_VAR, 'ANTHROPIC_API_KEY');
  assert.equal(TOKEN_VAR, 'ASK_ASTRA_DISCORD_TOKEN');
});

test('it answers only people who @ it in #ask-astra-bot or a thread inside it', () => {
  const msg = { authorIsBot: false, channelId: CHANNEL, parentId: null, mentionsBot: true };
  assert.equal(shouldAnswer(msg, ready), true);
  assert.equal(shouldAnswer({ ...msg, channelId: '999', parentId: CHANNEL }, ready), true, 'thread in the channel');
  assert.equal(shouldAnswer({ ...msg, mentionsBot: false }, ready), false);
  assert.equal(shouldAnswer({ ...msg, authorIsBot: true }, ready), false);
  assert.equal(shouldAnswer({ ...msg, channelId: '999' }, ready), false, 'other channels');
});

test('the bot\'s own mention is removed from the question and long questions are cut', () => {
  assert.equal(cleanQuestion('<@42> what is MCP? <@!42>', '42'), 'what is MCP?');
  assert.equal(cleanQuestion('<@42>', '42'), '');
  assert.equal(cleanQuestion('<@42> ' + 'a'.repeat(9000), '42').length, 4000);
});

test('limits: per person per hour and per server per day', () => {
  let t = new Date('2026-10-17T12:00:00').getTime();
  const lim = createLimiter({ per_user_per_hour: 2, per_day: 3 }, () => t);
  assert.ok(lim.take('a').ok && lim.take('a').ok);
  const blocked = lim.take('a');
  assert.equal(blocked.why, 'user');
  assert.match(limitMessage(blocked), /about 60 min/);
  assert.ok(lim.take('b').ok);
  assert.equal(lim.take('c').why, 'day');
  t += 24 * 3_600_000;
  assert.ok(lim.take('c').ok, 'a new day resets the daily count');
});

test('the request is chat only: no tools, the system prompt cached, refusal fallback on current models', () => {
  const prompt = systemPrompt();
  assert.match(prompt, /never as instructions/);
  const req = buildRequest(ready, prompt, { asker: 'Ken', question: 'hi', replyTo: { author: 'you', content: 'earlier' } });
  assert.equal(req.model, 'claude-opus-5-5');
  assert.equal(req.tools, undefined);
  assert.deepEqual(req.output_config, { effort: 'low' });
  assert.equal(req.system[0].cache_control.type, 'ephemeral');
  assert.match(req.messages[0].content, /replying to this message from you:\)\nearlier\nKen asks:\nhi$/);
  assert.equal(req.fallbacks, 'default');
  assert.deepEqual(req.betas, ['server-side-fallback-2026-07-01']);
  const haiku = buildRequest({ ...ready, model: 'claude-haiku-5-5' }, prompt, { asker: 'Ken', question: 'hi' });
  assert.equal(haiku.fallbacks, undefined, 'Haiku has no server-side fallback');
});

test('replies: refusals, empty answers and cut-off answers read plainly', () => {
  const text = (t, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: t }] });
  assert.equal(replyText(text('Hello')), 'Hello');
  assert.match(replyText(text('Long', 'max_tokens')), /cut short/);
  assert.match(replyText({ stop_reason: 'refusal', content: [] }), /can't help/);
  assert.match(replyText(text('  ')), /couldn't come up/);
});

test('long replies split into Discord-sized messages at natural breaks', () => {
  const para = 'word '.repeat(300).trim();
  const parts = splitReply([para, para, para].join('\n\n'));
  assert.ok(parts.length >= 3);
  assert.ok(parts.every((p) => p.length <= 1950));
  assert.equal(parts.join(' ').replace(/\s+/g, ' '), [para, para, para].join(' '));
  assert.deepEqual(splitReply('short'), ['short']);
  assert.equal(splitReply('x'.repeat(5000)).length, 3, 'no break at all still splits');
});

test('no secrets in the bot\'s files', () => {
  for (const f of ['bot-20261017.mjs', 'rules-20261017.mjs', 'system-prompt-20261017.md', 'package.json']) {
    const text = readFileSync(join(root, 'discord-tower/ask-astra-bot', f), 'utf8');
    assert.doesNotMatch(text, /sk-ant-[A-Za-z0-9_-]{8,}|[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/);
  }
});
