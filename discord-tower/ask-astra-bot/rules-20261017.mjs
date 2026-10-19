// The Ask Astra bot's rules, kept free of Discord and Anthropic code so `node --test` at the repo root can check them
// without installing anything. bot-20261017.mjs wires these into discord.js and the Anthropic SDK.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const TOOL = 'press-plai-ask-astra-bot';
export const SCHEMA = 1;                       // same settings file and schema as the file updaters
export const TOKEN_VAR = 'ASK_ASTRA_DISCORD_TOKEN';
// Not ANTHROPIC_API_KEY: Claude Code reads that name, and setting it would move Astra's own Claude Code off her plan.
export const KEY_VAR = 'ASK_ASTRA_ANTHROPIC_API_KEY';
export const DISCORD_LIMIT = 2000;             // Discord's message length limit
export const MAX_QUESTION = 4000;              // longer questions are cut before they reach the API

export const DEFAULTS = Object.freeze({
  on: false,
  channel_id: '',
  model: 'claude-opus-5-5',
  effort: 'low',
  max_tokens: 4000,
  per_user_per_hour: 10,
  per_day: 200,
});

// Models that take the API's server-side refusal fallback (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const SNOWFLAKE = /^\d{17,20}$/;

export function settingsDir(env = process.env) {
  const base = env.LOCALAPPDATA || join(env.HOME || env.USERPROFILE || '.', '.local', 'share');
  return join(base, 'astras-pet-os', 'discord-tower', 'press-plai');
}

const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; } };

// Adds the bot's entry (OFF) to the shared settings file, keeping every other tool's entry as it is.
export function ensureBotSettings(dir) {
  const file = join(dir, 'settings.json');
  const settings = readJson(file, { schema: SCHEMA, tools: {} });
  settings.tools ??= {};
  const before = JSON.stringify(settings.tools[TOOL] ?? null);
  settings.tools[TOOL] = { ...DEFAULTS, ...settings.tools[TOOL] };
  if (!existsSync(file) || settings.schema !== SCHEMA || JSON.stringify(settings.tools[TOOL]) !== before) {
    settings.schema = SCHEMA;
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  }
  return { file, bot: settings.tools[TOOL] };
}

// Every reason the bot must not start, in plain words. Empty means ready. Never echoes a secret.
export function problems(bot, env = process.env) {
  const out = [];
  if (bot.on !== true) out.push('The bot is OFF. Set "on": true for press-plai-ask-astra-bot in the settings file.');
  if (!SNOWFLAKE.test(String(bot.channel_id))) out.push('"channel_id" is not a Discord channel ID (right-click #ask-astra-bot > Copy Channel ID).');
  if (!env[TOKEN_VAR]) out.push(`The environment variable ${TOKEN_VAR} (the bot token) is not set.`);
  if (!env[KEY_VAR]) out.push(`The environment variable ${KEY_VAR} (the Anthropic API key) is not set.`);
  else if (!String(env[KEY_VAR]).startsWith('sk-ant-')) out.push(`${KEY_VAR} does not look like an Anthropic API key (they start with sk-ant-).`);
  if (!EFFORTS.has(bot.effort)) out.push(`"effort" must be one of: ${[...EFFORTS].join(', ')}.`);
  for (const k of ['max_tokens', 'per_user_per_hour', 'per_day']) if (!(Number.isInteger(bot[k]) && bot[k] > 0)) out.push(`"${k}" must be a whole number above 0.`);
  return out;
}

// Answer only people (not bots), only in the one channel or a thread inside it, only when @mentioned directly.
export function shouldAnswer({ authorIsBot, channelId, parentId, mentionsBot }, bot) {
  if (authorIsBot || !mentionsBot) return false;
  return channelId === bot.channel_id || parentId === bot.channel_id;
}

// Removes the bot's own mention(s) and trims. Other mentions stay as written.
export function cleanQuestion(content, botId) {
  return content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim().slice(0, MAX_QUESTION);
}

// Per-person hourly limit and a whole-server daily limit, both in memory (a restart resets them; the spend limit in
// the Anthropic Console is the real ceiling).
export function createLimiter({ per_user_per_hour, per_day }, now = () => Date.now()) {
  const recent = new Map();
  let day = '', today = 0;
  return {
    take(userId) {
      const t = now();
      const d = new Date(t).toDateString();
      if (d !== day) { day = d; today = 0; }
      if (today >= per_day) return { ok: false, why: 'day' };
      const mine = (recent.get(userId) || []).filter((s) => t - s < 3_600_000);
      if (mine.length >= per_user_per_hour) { recent.set(userId, mine); return { ok: false, why: 'user', retryMin: Math.ceil((3_600_000 - (t - mine[0])) / 60_000) }; }
      mine.push(t); recent.set(userId, mine); today++;
      return { ok: true };
    },
  };
}

export function limitMessage({ why, retryMin }) {
  return why === 'day'
    ? "I've answered all I can for today. Try again tomorrow."
    : `You've hit my limit for the hour. Try again in about ${retryMin} min.`;
}

export function systemPrompt(file = new URL('./system-prompt-20261017.md', import.meta.url)) {
  return readFileSync(file, 'utf8').trim();
}

// The Messages API request for one question. `replyTo` is the message being replied to, if any.
export function buildRequest(bot, prompt, { asker, question, replyTo }) {
  const text = [
    replyTo ? `(${asker} is replying to this message from ${replyTo.author}:)\n${replyTo.content.slice(0, MAX_QUESTION)}\n` : '',
    `${asker} asks:\n${question}`,
  ].join('');
  const req = {
    model: bot.model,
    max_tokens: bot.max_tokens,
    output_config: { effort: bot.effort },
    system: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: text }],
  };
  if (FALLBACK_MODELS.has(bot.model)) Object.assign(req, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  return req;
}

// The text to post for a Messages API response.
export function replyText(response) {
  if (response.stop_reason === 'refusal') return "Sorry, I can't help with that one.";
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) return "I couldn't come up with an answer. Try asking another way.";
  return response.stop_reason === 'max_tokens' ? `${text}\n\n*(cut short)*` : text;
}

// Splits a reply into Discord-sized messages, preferring paragraph, then line, then word breaks.
export function splitReply(text, limit = DISCORD_LIMIT - 50) {
  const parts = [];
  let rest = text;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    let cut = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('\n'));
    if (cut < limit / 2) cut = window.lastIndexOf(' ');
    if (cut < limit / 2) cut = limit;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}
