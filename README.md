# AI Discord Presence

*By Astra.* Show your friends on Discord which AI you're working with, which model, what it's working on and for how
long. Two small Windows apps, one per company.

## The card

What your friends see on your Discord profile while the app is sharing:

<table>
<tr>
<th width="50%"><a href="https://github.com/findastra/openai-discord-presence">OpenAI Discord Presence</a><br><sub>for Codex</sub></th>
<th width="50%"><a href="https://github.com/findastra/anthropic-discord-presence">Anthropic Discord Presence</a><br><sub>for Claude Code</sub></th>
</tr>
<tr>
<td width="50%"><a href="https://github.com/findastra/openai-discord-presence"><img src="docs/images/openai-card-20261029.gif" alt="OpenAI Discord Presence card: Using GPT-6 Astra on Ultra, Working on Astra's Infinite Pole, timer running" width="100%"></a></td>
<td width="50%"><a href="https://github.com/findastra/anthropic-discord-presence"><img src="docs/images/anthropic-card-20261029.gif" alt="Anthropic Discord Presence card: Using Claude Opus 5.5 on Max, Working on Astra's Infinite Pole, timer running" width="100%"></a></td>
</tr>
</table>

The company, the model and effort, the chat's name (if you turn it on) and the time. Several chats take turns.

## The app

A small program on your PC. Its page opens in your browser and shows a live preview of your card.

<table>
<tr>
<th width="50%">OpenAI Discord Presence</th>
<th width="50%">Anthropic Discord Presence</th>
</tr>
<tr>
<td width="50%"><a href="openai-discord-presence/README.md"><img src="docs/images/openai-app-20261029.png" alt="OpenAI Discord Presence's page: the galaxy, the Start, Stop, Automatic, Hide Chat Topic and Quit buttons, and the card" width="100%"></a></td>
<td width="50%"><a href="anthropic-discord-presence/README.md"><img src="docs/images/anthropic-app-20261029.png" alt="Anthropic Discord Presence's page: the galaxy, the Start, Stop, Automatic, Hide Chat Topic and Quit buttons, and the card" width="100%"></a></td>
</tr>
<tr>
<td align="center"><b><a href="https://github.com/findastra/ai-discord-presence/raw/main/downloads/openai-discord-presence.zip">⬇ Download for Windows</a></b></td>
<td align="center"><b><a href="https://github.com/findastra/ai-discord-presence/raw/main/downloads/anthropic-discord-presence.zip">⬇ Download for Windows</a></b></td>
</tr>
<tr>
<td align="center"><a href="openai-discord-presence/README.md">Everything about the OpenAI app</a></td>
<td align="center"><a href="anthropic-discord-presence/README.md">Everything about the Anthropic app</a></td>
</tr>
</table>

### The buttons

| Button | What it does |
| --- | --- |
| <img src="docs/images/button-start-20261029.png" alt="Start" width="118"> | Puts the card on your profile now and starts the timer, until you click Stop or Quit. Use it for Claude on the web, desktop chat and cloud sessions. |
| <img src="docs/images/button-stop-20261029.png" alt="Stop" width="118"> | Takes the card off your profile. The app keeps running. |
| <img src="docs/images/button-automatic-20261029.png" alt="Automatic" width="118"> | Shows the card while Codex or Claude Code is working, and hides it five minutes after. |
| <img src="docs/images/button-chat-topic-20261029.png" alt="Hide Chat Topic" width="118"> | Takes the chat's name off the card. Click it again (Show Chat Topic) to put it back. |
| <img src="docs/images/button-quit-20261029.png" alt="Quit" width="118"> | Closes the app. Click it twice within 3 seconds. |

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
