# Anthropic Discord Presence

A free Windows companion for sharing Claude activity on Discord, with locally detected model information, an elapsed timer and an animated galaxy.

**[Download for Windows](https://github.com/findastra/ai-discord-presence/raw/main/downloads/anthropic-discord-presence.zip)**

## Start it

The official gold five-arm artwork uses individual stars flowing into a white core,
with black outer edges. Approved by Astra, October 30, 2026.
[Artwork and source](../docs/official-galaxy-artwork-20261030.md). **Pause stars**
stops the page animation; the device's reduced-motion preference is respected.

1. Install [Node.js 24 or later](https://nodejs.org/en/download) if needed. No npm install is required.
2. Extract the download and double-click **Start Anthropic Discord Presence.cmd**.
3. Keep Discord desktop open with activity sharing enabled. Click **Automatic** for Claude Code, or **Start** for Claude on the web, desktop chat and cloud sessions.
4. Optional: double-click **Enable Automatic Startup.cmd** to start it with Windows. Keep the extracted folder in place.
5. Optional: set `"alwaysOn": true` in `.local/config.json` to share whenever the app is running. Together with Windows startup, the card is up all day without clicking anything.

The page's buttons: **Start**, **Stop**, **Automatic**, **Show Chat Topic** and **Quit** (click twice). See [the main README](https://github.com/findastra/ai-discord-presence#buttons--instructions).

The Discord application ID and hosted image are included. No API key, bot token, account connection or art upload is needed. A custom Discord application is optional.

## System tray

On Windows the companion puts a galaxy icon in the system tray (by the clock; it may sit under the ^ arrow). Right-click it for **Start session**, **Automatic**, **Stop sharing**, **Open control panel** and **Quit app**, or double-click to open the control panel. The icon disappears when the app quits. It uses Windows PowerShell, which is built into Windows.

## What Discord shows

The profile card contains the detected model and effort when available, an optional project name, and a session timer. Discord can use the registered application name in other surfaces, such as voice-channel activity labels.

Both companions can run together, but Discord may display only one activity at a time. A successful local RPC acknowledgement means Discord accepted the update; it does not prove every card is visible. Check the full profile and Discord’s activity privacy settings.

Automatic requires Claude Code conversation activity recorded within the last five minutes, including desktop Code sessions when supported local metadata is available. An open Claude app or a recently touched transcript file does not count. Model and effort labels come from parsed session metadata.

Regular Claude desktop chat has no reliable automatic detector here. Click **Start** when you begin and **Stop** when you finish; unavailable model metadata is labeled **Using Claude**.

**Always on** (`"alwaysOn": true` in `.local/config.json`; the page has no switch for it) starts a session every time the app launches, including at Windows sign-in, and turning it on starts one immediately. Use it for Claude on the web, desktop chat and cloud sessions, which leave nothing on this computer to detect. The card shows **Using Claude**, or the exact model and effort while Claude Code on this computer reports them. **Stop** pauses it until the next launch. It is off by default.

**Start** stays active until **Stop** or **Quit**. The timer measures this companion’s continuous active session, not model computation time. Closing the browser tab leaves the companion running.

## Project sharing

Project sharing is off by default. Click **Show Chat Topic** and each Claude Code session is named, first match wins:

1. **The session's own name**, if you renamed it with `/rename` in Claude Code. Rename it and the card follows within a few seconds.
2. **The folder** the session works in (its last part only, e.g. `paper-girl`), if that folder still exists.

A chat started from another chat in the Claude desktop app (listed under it in the sidebar) shows the **top-level chat's** name, or that chat's folder when it has no name; its own name is not shown. Detach it in the app and it shows its own name again.

Old folder names of Astra's own project (`Findastra Pet Apps`, `astras-pet-os`) show as **Astra's PetOS**; a session name you set always wins over that.

Automatic session titles (made from what you typed) are never used, and full paths are never published. For a fixed label instead, set `projectName` in `.local/config.json` in the app folder (click **Quit**, edit, then start the app again); it stays until you clear it.

Every session active in the last five minutes takes a turn: the card moves to the next project every **6 seconds** (Discord accepts about five updates per 20 seconds, so this is as fast as is safe). Sessions in the same project with the same model share one turn; each turn keeps its own model and effort. The control panel lists every project taking turns. With a fixed label or sharing off, the newest session supplies the model and effort. Sessions without a usable name show **Exploring ideas** only when no other session has one.

## Updating and startup

Before starting an updated or relocated copy, click **Quit** (twice) on the old copy's page. The launcher checks the running installation and source build; it reports a conflict instead of silently opening an older copy. If the folder moved, enable startup from the new copy again.

To disable startup, run `node scripts/startup.js --remove`. This also disables Automatic on the next launch. The startup installer creates default settings for a fresh download and validates configuration before replacing an existing launcher.

## Optional custom application

Create an application in the [Discord Developer Portal](https://discord.com/developers/applications), then put its Application ID in `clientId` and an image in `image` in `.local/config.json` in the app folder (click **Quit**, edit, then start the app again). `image` accepts an uploaded asset key or a public HTTPS image URL. Uploaded assets are static; external URLs support animated images. The default uses a hosted GIF.

## Privacy

The detector scans complete Claude Code JSONL records backwards to extract conversation timestamps, model, effort and working-directory fields, including when an individual record exceeds 64 KB. Conversation text is discarded and never published or retained in the metadata cache. With project sharing on it also reads `/rename` records (`{"type":"custom-title"}`) to name a session; each transcript is read once for these, then only the bytes added since the last check. Automatic titles are never used. To find a chat's top-level chat it reads the Claude desktop app's session files (`claude-code-sessions\…\local_*.json`) and keeps three fields: the transcript id, the id of the chat it was started from, and whether it was detached. Titles, summaries and reports in those files are not used.

The control server binds only to `127.0.0.1`, checks Host and Origin for changes, and sends no telemetry. Discord receives activity text, a timestamp, an image URL and an optional project label. Settings remain in the Git-ignored `.local/config.json`. The local status endpoint includes installation/build identity so the launcher can detect old running copies; that identity is not sent to Discord.

## Development

```sh
node --test
node src/server.js
```

The controls use `http://127.0.0.1:38762/`. `ANTHROPIC_PRESENCE_PORT` changes the port only when running the server directly. `node scripts/package.mjs` at the repository root rebuilds both Windows ZIPs. The local control panel requires the companion server.

The galaxy artwork is original. This independent project is not affiliated with Anthropic or Discord. Product and model names identify the software being used.
