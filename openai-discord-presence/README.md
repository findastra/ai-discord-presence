# OpenAI Discord Presence

A free Windows companion for sharing Codex activity on Discord, with locally detected model information, an elapsed timer and an animated galaxy.

**[Download for Windows](https://github.com/findastra/ai-discord-presence/raw/main/downloads/openai-discord-presence.zip)**

## Start it

The official blue six-arm artwork uses individual stars flowing into a white core,
with black outer edges. Approved by Astra, October 30, 2026.
[Artwork and source](https://github.com/findastra/ai-discord-presence/blob/main/docs/official-galaxy-artwork-20261030.md). **Pause stars**
stops the page animation; the device's reduced-motion preference is respected.

1. Install [Node.js 24 or later](https://nodejs.org/en/download) if needed. No npm install is required.
2. Extract the download and double-click **Start OpenAI Discord Presence.cmd**.
3. Keep Discord desktop open with activity sharing enabled, then click **Automatic**.
4. Optional: double-click **Enable Automatic Startup.cmd** to start it with Windows. Keep the extracted folder in place.

The page's buttons: **Start**, **Stop**, **Automatic**, **Show Chat Topic** and **Quit** (click twice). See [the main README](https://github.com/findastra/ai-discord-presence#buttons--instructions).

The Discord application ID and hosted image are included. No API key, bot token, account connection or art upload is needed. A custom Discord application is optional.

## System tray

On Windows the companion puts a galaxy icon in the system tray (by the clock; it may sit under the ^ arrow). Right-click it for **Start session**, **Automatic**, **Stop sharing**, **Open control panel** and **Quit app**, or double-click to open the control panel. The icon disappears when the app quits. It uses Windows PowerShell, which is built into Windows.

## What Discord shows

The profile card contains the detected model and effort when available, an optional project name, and a session timer. Discord can use the registered application name in other surfaces, such as voice-channel activity labels.

Both companions can run together, but Discord may display only one activity at a time. A successful local RPC acknowledgement means Discord accepted the update; it does not prove every card is visible. Check the full profile and Discord’s activity privacy settings.

Automatic reads recent primary Codex task metadata, excluding archived tasks and subagents. It hides after five minutes without a recent update. Background metadata updates can extend that window; long silent reasoning can exceed it. It does not track window focus. Unavailable or stale model metadata is labeled **Using OpenAI**, rather than guessed.

**Start** stays active until **Stop** or **Quit**. The timer measures this companion’s continuous active session, not model computation time. Closing the browser tab leaves the companion running.

## Project sharing

Project sharing is off by default. Click **Show Chat Topic** and each Codex chat is named, first match wins:

1. **The chat's own name**, if you renamed the chat in Codex. Rename it and the card follows within a few seconds.
2. **The folder** the chat works in (its last part only, e.g. `paper-girl`), if that folder still exists.
3. **The saved Codex project**, for chats in Codex's own scratch folders or whose folder no longer exists.

Old folder names of Astra's own project (`Findastra Pet Apps`, `astras-pet-os`) show as **Astra's PetOS**; a chat name you set always wins over that.

Automatic chat titles (the ones Codex makes from your first message) are never used, and full paths are never published. For a fixed label instead, set `projectName` in `.local/config.json` in the app folder (click **Quit**, edit, then start the app again); it stays until you clear it.

Every chat active in the last five minutes takes a turn: the card moves to the next project every **6 seconds** (Discord accepts about five updates per 20 seconds, so this is as fast as is safe). Chats in the same project with the same model share one turn; each turn keeps its own model and effort. The control panel lists every project taking turns. With a fixed label or sharing off, the newest chat supplies the model and effort. Chats without a usable name show **Exploring ideas** only when no other chat has one.

## Updating and startup

Before starting an updated or relocated copy, click **Quit** (twice) on the old copy's page. The launcher checks the running installation and source build; it reports a conflict instead of silently opening an older copy. If the folder moved, enable startup from the new copy again.

To disable startup, run `node scripts/startup.js --remove`. This also disables Automatic on the next launch. The startup installer creates default settings for a fresh download and validates configuration before replacing an existing launcher.

## Optional custom application

Create an application in the [Discord Developer Portal](https://discord.com/developers/applications), then put its Application ID in `clientId` and an image in `image` in `.local/config.json` in the app folder (click **Quit**, edit, then start the app again). `image` accepts an uploaded asset key or a public HTTPS image URL. Uploaded assets are static; external URLs support animated images. The default uses a hosted GIF.

## Privacy

The detector opens Codex’s local SQLite task database read-only and reads model, effort, update time and folder metadata. It never reads prompts, replies or automatic chat titles. With project sharing on it also reads the name you gave a chat (only when you renamed it) and saved project names. The project-name file is read at most every 30 seconds and only when it changed.

The control server binds only to `127.0.0.1`, checks Host and Origin for changes, and sends no telemetry. Discord receives activity text, a timestamp, an image URL and an optional project label. Settings remain in the Git-ignored `.local/config.json`. The local status endpoint includes installation/build identity so the launcher can detect old running copies; that identity is not sent to Discord.

## Development

```sh
node --test
node src/server.js
```

The controls use `http://127.0.0.1:38761/`. `OPENAI_PRESENCE_PORT` changes the port only when running the server directly. `node scripts/package.mjs` at the repository root rebuilds both Windows ZIPs. The local control panel requires the companion server.

The galaxy artwork is original. This independent project is not affiliated with OpenAI or Discord. Product and model names identify the software being used.
