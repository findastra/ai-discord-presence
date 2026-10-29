# AI Discord Presence

*By Astra.* Show your friends on Discord which AI you're working with, which model, what it's working on and for how
long. Two small Windows apps, one per company.

## The card

What your friends see on your Discord profile:

<p align="center">
<a href="https://github.com/findastra/openai-discord-presence"><img src="docs/images/openai-card-20261029.gif" alt="OpenAI Discord Presence card: Using GPT-6 Astra on Ultra, Working on Astra's Infinite Pole, timer running" width="48%"></a>
<a href="https://github.com/findastra/anthropic-discord-presence"><img src="docs/images/anthropic-card-20261029.gif" alt="Anthropic Discord Presence card: Using Claude Opus 5.5 on Max, Working on Astra's Infinite Pole, timer running" width="48%"></a>
</p>

<p align="center">
<b><a href="https://github.com/findastra/openai-discord-presence">OpenAI Discord Presence</a></b> for Codex
&nbsp;·&nbsp;
<b><a href="https://github.com/findastra/anthropic-discord-presence">Anthropic Discord Presence</a></b> for Claude Code
</p>

- **The company**, then **the model and effort** it detects.
- **The chat's name**, only if you turn on **Show Chat Topic**.
- **The time** since you started.
- Several chats at once take 6-second turns, each with its own model.

## The app

A small program on your PC. Its page opens in your browser with five buttons: **Start**, **Stop**, **Automatic**,
**Show Chat Topic** and **Quit**.

**[⬇ OpenAI Discord Presence](https://github.com/findastra/ai-discord-presence/raw/main/downloads/openai-discord-presence.zip)**
· **[⬇ Anthropic Discord Presence](https://github.com/findastra/ai-discord-presence/raw/main/downloads/anthropic-discord-presence.zip)**

1. Install [Node.js 24 or later](https://nodejs.org/en/download).
2. Unzip the download and double-click **Start OpenAI Discord Presence.cmd** (or **Start Anthropic Discord
   Presence.cmd**).
3. Click **Automatic**, and keep Discord desktop open with activity sharing on.

Optional: **Enable Automatic Startup.cmd** starts it with Windows. No account, API key or Discord setup; everything
runs on your PC and only the card goes to your own Discord.

## Quirks

- **Automatic** sees only Codex and Claude Code. Claude on the web, the Claude desktop chat and cloud sessions leave
  nothing on your PC to detect: click **Start** instead.
- Automatic counts activity from the last five minutes, so a long silent think can drop off for a moment.
- Both apps can run together, but Discord may show only one card.
- A chat started from another chat in the Claude desktop app shows the first chat's name.
- To update, click **Quit** in the old copy first, and run **Enable Automatic Startup.cmd** again if you moved the
  folder.
- Windows only.

## How it was made

- OpenAI Discord Presence: OpenAI Codex (GPT-6), from 2026-09-12.
- Anthropic Discord Presence, the shared repo and the galaxy art: Claude Opus 5.5.
- Each galaxy has one arm per model generation (6 for GPT-6, 5 for Claude 5). Recipe:
  [docs/galaxy-art-20261017.md](docs/galaxy-art-20261017.md).
- Add another AI: [ADDING-A-MODEL.md](ADDING-A-MODEL.md). Full app details: [OpenAI](openai-discord-presence/README.md)
  · [Anthropic](anthropic-discord-presence/README.md).

Tests (every app plus the naming rules): `node --test`. Rebuild the downloads: `node scripts/package.mjs`. No
dependencies. Contributor (and AI assistant) rules: [CLAUDE.md](CLAUDE.md).

An independent project, not made, endorsed or sponsored by OpenAI, Anthropic or Discord. MIT-licensed code; original
galaxy art.
