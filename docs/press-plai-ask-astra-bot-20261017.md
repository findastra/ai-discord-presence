# Press Plai Ask Astra Bot

Tool: `discord-tower-v1.0-press-plai-ask-astra-bot-v1.0` (Discord Tower, pet: Discord Damsel). Channel: **#ask-astra-bot**.
Code: [discord-tower/ask-astra-bot/](../discord-tower/ask-astra-bot/). Assistants follow
[skills/press-plai-ask-astra-bot/SKILL.md](../skills/press-plai-ask-astra-bot/SKILL.md).

Members @ the bot in #ask-astra-bot and Claude answers, the same way #ask-ken-bot works. Ken's bot is OpenClaw
behind CLI Proxy on his Codex plan. **This one is Discord Damsel's own small bot** (Astra, 2026-10-17): about 250
lines, chat only. It has no tools, reads no files and runs no commands, so nobody in the server can talk it into
touching your PC. It answers only when @mentioned, only in #ask-astra-bot (and threads inside it), never pings anyone,
and has a per-person hourly limit and a daily limit.

## It runs on an Anthropic API key, not your Claude Max plan

A Claude subscription (Pro or Max) is for you personally. Putting other people's questions on it through a bot or
proxy is account sharing, goes against Anthropic's terms, and can get the account suspended. For a bot other people
use, the supported way is an **Anthropic API key**, billed per use, separately from Max.

- Make the key at console.anthropic.com → **API Keys** → **Create Key**, name it `press-plai-ask-astra-bot`.
- **Set a monthly spend limit first** (Console → **Billing** → **Limits**). A public bot can be spammed; the bot's own
  limits reset when it restarts, the Console limit does not.
- Add its name (not the key) to API Fairy.
- The bot uses **Claude Opus 5.5 at low effort** by default. To spend less, change `"model"` in the settings file to
  `claude-sonnet-5-5` or `claude-haiku-5-5` (Haiku is by far the cheapest; answers are simpler).

## Setup (about 20 minutes, you do each step)

1. **Discord app.** discord.com/developers/applications → **New Application** → name it **Ask Astra** → **Bot** →
   **Reset Token** and copy it (it is a password). Leave every **Privileged Gateway Intent** OFF; the bot doesn't
   need them, because Discord always gives a bot the text of messages that @mention it.
2. **Invite it with the smallest permissions.** **OAuth2** → **URL Generator** → scope `bot`; permissions
   **View Channels**, **Send Messages**, **Send Messages in Threads**, **Read Message History**. Never
   **Administrator**, **Manage Roles**, **Manage Channels** or **Manage Server**. Open the URL and pick Press Plai.
3. **Keep it in one channel.** Press Plai → **Server Settings** → **Integrations** → **Ask Astra** → **Channels**:
   only **#ask-astra-bot**.
4. **Save the two secrets as environment variables** (only on your PC). Start menu → type **environment** →
   **Edit environment variables for your account** → under *User variables* **New...** twice:
   - `ASK_ASTRA_DISCORD_TOKEN` = the bot token
   - `ASK_ASTRA_ANTHROPIC_API_KEY` = the API key (`sk-ant-...`)

   Use exactly these names. Do **not** name it `ANTHROPIC_API_KEY`: Claude Code reads that name and would start
   billing your own sessions to the API instead of your Max plan. Click **OK**, then close and reopen any window
   you start the bot from.
5. **Turn it on.** Double-click **Start Press Plai Ask Astra Bot.cmd** (repo root) once. The first time it installs
   its two libraries (discord.js and the Anthropic SDK), adds the bot to
   `%LOCALAPPDATA%\astras-pet-os\discord-tower\press-plai\settings.json` (the same file as the file updaters) with
   `"on": false`, and says what is missing. In Discord, turn on **User Settings** → **Advanced** → **Developer Mode**,
   right-click **#ask-astra-bot** → **Copy Channel ID**. In the settings file, under `press-plai-ask-astra-bot`, paste
   it into `"channel_id"`, set `"on": true`, save.
6. **Start it again** and test: in #ask-astra-bot type `@Ask Astra hello`. The window logs each answer (who asked,
   which model, tokens in and out), never the question or the keys.
7. Pin a message in #ask-astra-bot like Ken's, for example: "Just @ the bot to use it. It runs on Astra's
   Anthropic API key, please don't go crazy lol."

It answers only while that window is open and your PC is on. Close the window (or Ctrl+C) to turn it off.

## Settings (`press-plai-ask-astra-bot` in settings.json)

| Setting | Default | Meaning |
|---|---|---|
| `on` | `false` | The bot refuses to start while this is false. |
| `channel_id` | `""` | #ask-astra-bot's channel ID. |
| `model` | `claude-opus-5-5` | Which Claude model answers. |
| `effort` | `low` | `low`, `medium`, `high`, `xhigh` or `max`. Higher thinks longer and costs more. |
| `max_tokens` | `4000` | Ceiling on one answer's length (and cost). |
| `per_user_per_hour` | `10` | Questions one person can ask per hour. |
| `per_day` | `200` | Questions the whole server can ask per day. |

The bot's personality and rules are in
[system-prompt-20261017.md](../discord-tower/ask-astra-bot/system-prompt-20261017.md); edit it on a branch.
On Opus 5.5 and Sonnet 5.5, a request the model declines is retried on another model by the API itself
(`fallbacks: "default"`); if every model declines, the bot says it can't help with that one.

## Limits

- It does not remember earlier messages, except the one a member replies to.
- Limits live in memory: restarting the bot resets them. The Console spend limit is the real ceiling.
- Not tested against Discord and the API with real keys yet; `node --test` checks its rules only.
- Discord Damsel's page shows this tool; it does not start or stop the bot.

Written by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-17. Rewritten the same night for Discord Damsel's own bot
in place of OpenClaw, at Astra's request.
