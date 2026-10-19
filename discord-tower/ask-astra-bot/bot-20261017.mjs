// Discord Tower's Ask Astra bot (tool press-plai-ask-astra-bot): members @ it in Press Plai's #ask-astra-bot and
// Claude answers. Chat only: it has no tools, reads no files and runs no commands, so nobody can talk it into
// touching Astra's PC. The rules live in rules-20261017.mjs; this file connects them to Discord and Anthropic.
//
// Secrets come from two environment variables (never from this repo): ASK_ASTRA_DISCORD_TOKEN, ASK_ASTRA_ANTHROPIC_API_KEY.
// Everything else: %LOCALAPPDATA%\astras-pet-os\discord-tower\press-plai\settings.json. Setup: docs/press-plai-ask-astra-bot-20261017.md
import { Client, Events, GatewayIntentBits } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';
import {
  TOKEN_VAR, KEY_VAR, settingsDir, ensureBotSettings, problems, shouldAnswer, cleanQuestion,
  createLimiter, limitMessage, systemPrompt, buildRequest, replyText, splitReply,
} from './rules-20261017.mjs';

const { file, bot } = ensureBotSettings(settingsDir());
const blockers = problems(bot);
if (blockers.length) {
  console.log(`Ask Astra bot did not start. Settings: ${file}\n- ${blockers.join('\n- ')}`);
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env[KEY_VAR] });
const prompt = systemPrompt();
const limiter = createLimiter(bot);
const quiet = { parse: [], repliedUser: false };   // never pings anyone, including @everyone written in an answer

// No privileged intents: Discord still delivers the text of messages that @mention the bot.
const discord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

discord.once(Events.ClientReady, (c) => {
  console.log(`Ask Astra bot is on as ${c.user.tag}, answering in channel ${bot.channel_id} with ${bot.model} (effort ${bot.effort}).`);
  console.log('Close this window or press Ctrl+C to turn it off.');
});

discord.on(Events.MessageCreate, async (message) => {
  const mentionsBot = message.mentions.has(discord.user, { ignoreEveryone: true, ignoreRoles: true });
  if (!shouldAnswer({ authorIsBot: message.author.bot, channelId: message.channelId, parentId: message.channel.parentId, mentionsBot }, bot)) return;

  const question = cleanQuestion(message.content, discord.user.id);
  if (!question) return void message.reply({ content: 'Ask me something after the @.', allowedMentions: quiet });
  const turn = limiter.take(message.author.id);
  if (!turn.ok) return void message.reply({ content: limitMessage(turn), allowedMentions: quiet });

  try {
    await message.channel.sendTyping();
    let replyTo;
    if (message.reference?.messageId) {
      const ref = await message.fetchReference().catch(() => null);
      if (ref?.content) replyTo = { author: ref.author.id === discord.user.id ? 'you' : ref.member?.displayName ?? ref.author.username, content: ref.content };
    }
    const asker = message.member?.displayName ?? message.author.username;
    const response = await anthropic.beta.messages.create(buildRequest(bot, prompt, { asker, question, replyTo }));
    const [first, ...more] = splitReply(replyText(response));
    await message.reply({ content: first, allowedMentions: quiet });
    for (const part of more) await message.channel.send({ content: part, allowedMentions: quiet });
    const u = response.usage;
    console.log(`${new Date().toLocaleTimeString()} answered ${message.author.username} (${response.model}, ${u.input_tokens} in, ${u.output_tokens} out)`);
  } catch (error) {
    console.log(`${new Date().toLocaleTimeString()} failed for ${message.author.username}: ${describe(error)}`);
    await message.reply({ content: 'Something went wrong on my side. Try again in a bit.', allowedMentions: quiet }).catch(() => {});
  }
});

// Plain words for the console. Messages from the SDK never contain the key.
function describe(error) {
  if (error instanceof Anthropic.AuthenticationError) return `the Anthropic API key was rejected (check ${KEY_VAR})`;
  if (error instanceof Anthropic.PermissionDeniedError) return 'the API key may not use this model';
  if (error instanceof Anthropic.RateLimitError) return 'Anthropic rate limit, try again shortly';
  if (error instanceof Anthropic.BadRequestError) return `Anthropic refused the request (${error.message}); out of credit or spend limit reached?`;
  if (error instanceof Anthropic.APIError) return `Anthropic error ${error.status}: ${error.message}`;
  return error?.message ?? String(error);
}

discord.login(process.env[TOKEN_VAR]).catch((error) => {
  console.log(`Discord did not accept the bot token (check ${TOKEN_VAR}): ${error.message}`);
  process.exit(1);
});
