status: open (waiting on Astra: Discord app, API key with a spend limit, the two environment variables, first test)
for: any
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-17
needs: AGENTS.md, CLAUDE.md, handoffs/003-any-press-plai-tools-20261017.md, docs/press-plai-ask-astra-bot-20261017.md, skills/press-plai-ask-astra-bot/SKILL.md
---
## What I did

Astra decided (2026-10-17, in a Claude Code session) **not to use OpenClaw** for Press Plai's #ask-astra-bot and to have
Discord Damsel's own small bot instead. This replaces the OpenClaw plan in card 003; the rest of card 003 (the four
file updaters) is unchanged.

**This repo, branch `claude/ask-astra-bot-20261017`**, built on `claude/press-plai-tools-20261017` (card 003), not on `main`:
- `discord-tower/ask-astra-bot/`: the bot. `bot-20261017.mjs` (discord.js 14.27.0 + Anthropic SDK 0.135.0, pinned in
  `package.json` and `package-lock.json`), `rules-20261017.mjs` (everything testable, no dependencies),
  `system-prompt-20261017.md`. Chat only: no tools, no files, no commands. Answers only @mentions in one channel (and
  threads in it), never pings, per-person hourly and server daily limits, no privileged intents.
  Default model `claude-opus-5-5` at effort `low` with the API's `fallbacks: "default"` for declined requests.
- Secrets only in Astra's environment variables `ASK_ASTRA_DISCORD_TOKEN` and `ASK_ASTRA_ANTHROPIC_API_KEY` (not
  `ANTHROPIC_API_KEY`, which Claude Code would pick up and bill her own sessions to). Other settings in the same
  `%LOCALAPPDATA%\astras-pet-os\discord-tower\press-plai\settings.json` as the updaters, entry `press-plai-ask-astra-bot`, OFF by default.
- `Start Press Plai Ask Astra Bot.cmd` (repo root): installs the two libraries on first start (`npm ci`), then runs it.
- `test/ask-astra-bot-20261017.test.mjs` (10 tests). `node --test` at the root: 85 of 85 pass.
- Rewrote `docs/press-plai-ask-astra-bot-20261017.md` and `skills/press-plai-ask-astra-bot/SKILL.md` for the own bot;
  `discord-tower/servers-20261017.json` and `discord-tower/README.md` point to the code.

**Astra's PC:** an earlier step of the same session had installed OpenClaw 2026.10.4 with npm (before this decision
and before card 003 was read, which said no agent installs it). Astra ran its onboarding, which added a scheduled task
"OpenClaw Gateway". Removed at her request in the same session: see the session's report for what was left, if anything.

## Not done
- Not run against Discord or the Anthropic API with real credentials: no token or key exists yet.
- Astra's steps 1 to 7 in the guide (Discord app, key and spend limit, variables, channel ID, test, pinned message).
- `pet.json` still does not list the Discord Tower tools (card 003's open item).
- Merge order: card 003's branch first (or together), then this one.

## Task
After Astra has done the guide's steps: watch the first answers in the bot's window, fix what breaks on a branch with
tests, then merge with card 003.

## Done when
The bot answers `@Ask Astra hello` in #ask-astra-bot, ignores other channels and un-mentioned messages, and this
card's `## What I did` is updated.

## Return
Update `## What I did`, set `status: done`, commit on a branch.
