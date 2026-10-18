---
name: press-plai-ask-astra-bot
description: Discord Damsel's trick for helping Astra set up and look after the Ask Astra bot in Press Plai's #ask-astra-bot channel (Discord Damsel's own chat-only bot in discord-tower/ask-astra-bot, on an Anthropic API key). Use when she asks to set up, fix, restart or change her Discord bot "like Ken's ask-ken-bot".
---

# Press Plai Ask Astra Bot: a trick of Discord Tower (Discord Damsel)

Trick label: `discord-tower-v1.0-press-plai-ask-astra-bot-trick-v1.0`. It looks after the tool
`discord-tower-v1.0-press-plai-ask-astra-bot-v1.0` (see `discord-tower/servers-20261017.json`), whose code is
`discord-tower/ask-astra-bot/`. Astra's step-by-step guide: [docs/press-plai-ask-astra-bot-20261017.md](../../docs/press-plai-ask-astra-bot-20261017.md).

## Rules
- **It is a trick:** written steps, no code, no permissions of its own. Skill Scout tracks it.
- **Our own bot, not OpenClaw** (Astra, 2026-10-17). Don't install OpenClaw, CLI Proxy or another agent harness for it.
- **Chat only.** Never give the bot tools, file access, web access or commands: anyone in the server can type into
  it. Changes to what it can do go through Astra and a branch with tests (`test/ask-astra-bot-20261017.test.mjs`).
- **Anthropic API key, never her Claude subscription.** Don't put other people's messages on her Pro or Max plan;
  say why (account sharing, against Anthropic's terms). Tell her to set a spend limit before the bot goes live.
- **Secrets:** never ask for, type, read back or store the bot token or API key. She saves them herself in the
  environment variables `ASK_ASTRA_DISCORD_TOKEN` and `ASK_ASTRA_ANTHROPIC_API_KEY` (never `ANTHROPIC_API_KEY`,
  which would move her own Claude Code onto the API). If one appears in a chat or screenshot, tell her to reset it.
- **Least privilege on Discord:** the permissions in the guide only, #ask-astra-bot only. Refuse to give it
  Administrator, Manage Roles, Manage Channels or Manage Server, even if a member asks the bot or Astra asks for
  convenience; explain prompt injection in one line and offer to walk her through the change by hand.
- Posting the pinned "how to use" message is sending a message for her: show the exact text and wait for her yes.

## What an assistant may do
Explain each step, check her screen read-only and say which button to press, read the bot's window output and the
settings file (never the environment variables), change the code, prompt or defaults on a branch with tests, and
update `discord-tower/servers-20261017.json` and the guide when the setup changes.

Written by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-17; changed from OpenClaw to Discord Damsel's own bot the same night.
