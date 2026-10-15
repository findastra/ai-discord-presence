# Findastra Discord Presence

Share AI activity on your Discord profile: the model and effort level when local metadata exposes them, an optional project name, an elapsed timer, and a swirling galaxy.

Two small Windows apps, one for each company's models. Both can run together, but Discord may display only one card even when it accepts both activities. Each card was verified individually on Discord desktop; simultaneous display is not guaranteed.

| | |
|:---:|:---:|
| ![OpenAI galaxy](openai-discord-presence/public/galaxy-card.gif) | ![Anthropic galaxy](anthropic-discord-presence/public/galaxy-card.gif) |
| **OpenAI Discord Presence** | **Anthropic Discord Presence** |
| Automatic for **Codex** | Automatic for **Claude Code**; manual or **Always on** for Claude on the web, desktop chat and cloud sessions |
| **[⬇ Download for Windows](https://github.com/findastra/findastra-discord-presence/raw/main/downloads/openai-discord-presence.zip)** | **[⬇ Download for Windows](https://github.com/findastra/findastra-discord-presence/raw/main/downloads/anthropic-discord-presence.zip)** |

## Start it (about 2 minutes)

1. Install [Node.js 24 or later](https://nodejs.org/en/download) if you don't have it.
2. Download and unzip the app(s) you want.
3. Double-click **Start OpenAI Discord Presence.cmd** (or **Start Anthropic Discord Presence.cmd**) in the unzipped folder. Your browser opens its controls.
4. Click **Automatic** for Codex or Claude Code. For regular Claude desktop chat, use **Start session** and **Stop sharing**, or turn on **Always on** in Settings. Keep Discord desktop open with activity sharing enabled.
5. Optional: double-click **Enable Automatic Startup.cmd** once so it starts with Windows.

When updating, quit the running companion from its control panel before opening the new copy. The launcher checks the installation and build so an older process cannot silently stand in for the update. If you move the folder, enable startup again from the new location.

No account, API key or Discord setup needed. Everything runs on your own computer; nothing is sent anywhere except the card itself to your own Discord app. Details: [OpenAI app](openai-discord-presence/README.md) · [Anthropic app](anthropic-discord-presence/README.md).

## What the card shows

> **OpenAI**
> Using GPT-6 Astra on Ultra
> Working on paper-girl
> 00:42 elapsed

The title is the company; the line under it is the detected model and effort level when available. Your project is opt-in: a chat or session you renamed shows that name (Codex rename, or `/rename` in Claude Code), otherwise the folder you're working in. Renames show within a few seconds. With several projects active, every one takes a turn on the card, one every 6 seconds, each paired with its own model and effort; the control panel lists them all.

Codex and Claude Code expose model metadata. Anthropic Automatic requires Claude Code conversation activity recorded in the last five minutes, including desktop Code sessions with supported local metadata. An open app or a touched transcript file does not count. Regular Claude desktop chat, Claude on the web and cloud sessions have no reliable automatic detector here; use manual **Start session** and **Stop sharing**, or turn on **Always on** in the Anthropic app's Settings to share whenever it runs. Missing model metadata is labeled **Using Claude** or **Using OpenAI**. Detection does not track foreground focus, and an accepted Discord activity is not proof that the profile displays it.

## The galaxies

Each galaxy has **one arm per model generation**: 6 for OpenAI (GPT-6) and 5 for Anthropic (Claude 5). When a new generation ships, its galaxy grows an arm. The animation follows real galaxy physics: stars near the core orbit several times faster than the rim, the arms trail, and stars brighten as they pass through an arm.

## Adding another AI

Want a card for Gemini, Copilot or another model? Each app is a self-contained folder, so a new one is a copy of an existing app with its detection, labels, Discord application and galaxy changed. Step-by-step guide: **[ADDING-A-MODEL.md](ADDING-A-MODEL.md)**.

## For developers

```sh
node --test                     # every app's tests plus the naming rules
node scripts/package.mjs        # rebuilds the downloads in downloads/
```

No dependencies; Node.js 24 only. Rules for contributors (and AI assistants) are in [CLAUDE.md](CLAUDE.md).

This is an independent project, not made, endorsed or sponsored by OpenAI, Anthropic or Discord. Their names and model names are their trademarks and appear only to say which product you're using. The code is MIT-licensed; the galaxy art is original.



## Discord Damsel

*A pet app by Astra.* Discord Damsel is the pet for this repo. Her pet program (pet-program-13 in
[Astra's PetOS](https://github.com/findastra/astras-pet-os)) runs two tools:

| Tool | Version | What it does |
|---|---|---|
| `pet-program-13-v1.0-openai-discord-presence-v0.2` | 0.2.0 | Codex: the OpenAI model and effort, and every active chat by its own name, folder or Codex project |
| `pet-program-13-v1.0-anthropic-discord-presence-v0.2` | 0.2.0 | Claude Code: the Anthropic model and effort, and every active session by its `/rename` name or folder |

**Start both tools in Automatic:** double-click [start-discord-damsel-20261014.cmd](start-discord-damsel-20261014.cmd). It first updates this folder from GitHub (only on `main`, only with no local changes, fast-forward only), then starts OpenAI and Anthropic Discord Presence in the background, asks any older copy of either app to quit, switches both to Automatic and opens her page. Keep this folder as the only copy on the PC: `%USERPROFILE%\Documents\Pet Programs\findastra-discord-presence` (`Documents\Projects` until it is renamed). Double-clicking Discord Damsel on the desktop does the same once the desktop pets are rebuilt (astras-pet-os card 014).

Her app is [findastra-discord-presence-20261008.html](findastra-discord-presence-20261008.html): open it in a browser, or
double-click Discord Damsel on the desktop. It links each tool's control page and keeps a setup checklist. Metadata
and the tool list are in [pet.json](pet.json); desktop art is in [desktop-pet-20261011.json](desktop-pet-20261011.json)
(draft).

### Limits

- Her app does not start the tools or change Discord by itself. Start each tool with its `Start … Discord Presence.cmd`.
- Both tools can run together, but Discord decides which card your profile shows; check the profile itself.
- A chat renamed in Codex shows only if Codex saves the name in its local database (`threads.name`, which current
  Codex source has). Not yet confirmed with the Codex desktop app on a live PC. A project renamed in Codex shows only
  for chats that have no folder of their own.

Pet interface and art: OpenAI Codex (GPT-6), 2026-10-08 and 2026-10-11. Chat and session names, the 6-second shuffle
and this summary: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-14.
