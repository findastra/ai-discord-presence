# AI Discord Presence

*By Astra.* Show your friends on Discord which AI you're working with, which model, what it's working on and for how
long. Two small Windows apps, one per company.

<table>
<tr>
<th width="50%"><a href="https://github.com/findastra/openai-discord-presence">OpenAI Discord Presence</a></th>
<th width="50%"><a href="https://github.com/findastra/anthropic-discord-presence">Anthropic Discord Presence</a></th>
</tr>
<tr>
<td align="center">for Codex</td>
<td align="center">for Claude Code</td>
</tr>
<tr>
<td align="center"><b><a href="https://github.com/findastra/ai-discord-presence/raw/main/downloads/openai-discord-presence.zip">⬇ Download for Windows</a></b></td>
<td align="center"><b><a href="https://github.com/findastra/ai-discord-presence/raw/main/downloads/anthropic-discord-presence.zip">⬇ Download for Windows</a></b></td>
</tr>
</table>

## The card

What your friends see on your Discord profile while the app is sharing:

<table>
<tr>
<td width="50%"><a href="https://github.com/findastra/openai-discord-presence"><img src="docs/images/openai-card-20261029.gif" alt="OpenAI Discord Presence card: Using GPT-6 Astra on Ultra, Working on Astra's Infinite Pole, timer running" width="100%"></a></td>
<td width="50%"><a href="https://github.com/findastra/anthropic-discord-presence"><img src="docs/images/anthropic-card-20261029.gif" alt="Anthropic Discord Presence card: Using Claude Opus 5.5 on Max, Working on Astra's Infinite Pole, timer running" width="100%"></a></td>
</tr>
</table>

- **Title:** the company.
- **Model and effort** it detects. When local metadata has none, the card says **Using OpenAI** or **Using Claude**.
- **Chat Topic** (off until you click **Show Chat Topic**): a chat you renamed shows that name (rename in Codex, or
  `/rename` in Claude Code), otherwise its folder. A chat started from another chat in the Claude desktop app shows the
  first chat's name. Renames show within seconds.
- **The time** since sharing started.
- **Several chats at once** take 6-second turns, each with its own model and effort.

## The app

A small program on your PC. Its page opens in your browser and shows a live preview of your card.

<table>
<tr>
<td width="50%"><a href="openai-discord-presence/README.md"><img src="docs/images/openai-app-20261029.png" alt="OpenAI Discord Presence's page: the galaxy, the Start, Stop, Automatic, Hide Chat Topic and Quit buttons, and the card" width="100%"></a></td>
<td width="50%"><a href="anthropic-discord-presence/README.md"><img src="docs/images/anthropic-app-20261029.png" alt="Anthropic Discord Presence's page: the galaxy, the Start, Stop, Automatic, Hide Chat Topic and Quit buttons, and the card" width="100%"></a></td>
</tr>
<tr>
<td align="center"><a href="openai-discord-presence/README.md">Everything about the OpenAI app</a></td>
<td align="center"><a href="anthropic-discord-presence/README.md">Everything about the Anthropic app</a></td>
</tr>
</table>

- **Start** shares until you click **Stop**. **Automatic** shares while Codex or Claude Code is working.
- **Show Chat Topic** adds the chat's name to the card. **Quit** closes the app.
- Start, Automatic, Stop and Quit are also in its galaxy tray icon by the clock (right-click it).

### Start it (about 2 minutes)

1. Install [Node.js 24 or later](https://nodejs.org/en/download).
2. Download your app from the top of this page, unzip it and double-click **Start OpenAI Discord Presence.cmd** (or
   **Start Anthropic Discord Presence.cmd**).
3. Click **Automatic**, and keep Discord desktop open with activity sharing on.

Optional: **Enable Automatic Startup.cmd** starts it with Windows. No account, API key or Discord setup; everything
runs on your PC and only the card goes to your own Discord app.

## Quirks

- **Automatic** sees Codex and Claude Code only. Claude on the web, desktop chat and cloud sessions leave nothing on
  your PC to detect: click **Start** instead.
- Automatic counts activity from the last five minutes. An open app or a touched file does not count, window focus is
  not tracked, and a long silent think can run past the five minutes.
- Both apps can run together, but Discord may show only one card; check your profile to see what friends see.
- Discord adds streaks and marathons only to games it recognises; an app's card cannot set them.
- To update, click **Quit** in the old copy first (the launcher refuses to let an older copy stand in), and run
  **Enable Automatic Startup.cmd** again if you moved the folder.
- Windows only, with Node.js 24+ and Discord desktop.

## How it was made

- OpenAI Discord Presence: OpenAI Codex (GPT-6), from 2026-09-12.
- Anthropic Discord Presence, the shared repo and the galaxy art: Claude Opus 5.5.
- **The galaxies:** one arm per model generation (6 for GPT-6, 5 for Claude 5); a new generation adds an arm. Stars
  near the core orbit faster than the rim, the arms trail, and stars brighten as they pass through an arm. Every prompt
  and command: [docs/galaxy-art-20261017.md](docs/galaxy-art-20261017.md); tools in [image-bridge/](image-bridge/README.md).
  New art costs money to generate and needs Astra's approval.
- **Adding another AI:** each app is a self-contained folder: copy one and change its detection, labels, Discord
  application and galaxy. Step by step: [ADDING-A-MODEL.md](ADDING-A-MODEL.md).
- **Tests** (every app plus the naming rules): `node --test`. **Rebuild the downloads:** `node scripts/package.mjs`.
  No dependencies. Contributor (and AI assistant) rules: [CLAUDE.md](CLAUDE.md).

An independent project, not made, endorsed or sponsored by OpenAI, Anthropic or Discord; their names appear only to say
which product you're using. MIT-licensed code; original galaxy art.
