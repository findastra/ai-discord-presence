# CLI Proxy API manager

A tool of **Discord Damsel** (Discord Tower, pet program #13 in
[Astra's PetOS](https://github.com/findastra/astras-pet-os)). Astra gave CLI Proxy API to Discord Damsel to look
after on 2026-10-18.

| | |
|---|---|
| Tool | `discord-tower-v1.0-cli-proxy-api-v1.0` (version 1.0.0) |
| Program it looks after | **CLI Proxy API** [v8.0.33](https://github.com/router-for-me/CLIProxyAPI/releases/tag/v8.0.33) by router-for-me: third-party, MIT license, not code-signed |
| What that program does | A local server that gives OpenAI-, Claude- and Gemini-style API addresses to programs on this PC, passing requests on to the accounts or API keys you add to it. Its console is the Management Center page it serves. |
| Controls | `http://127.0.0.1:38763/` (this PC only), opened by [cli-proxy-api-20261018.cmd](cli-proxy-api-20261018.cmd) |
| Proxy and console | `http://127.0.0.1:8317/` and `http://127.0.0.1:8317/management.html` |
| Files on the PC | `%USERPROFILE%\.cli-proxy-api\` (the program's own default folder): `program\v8.0.33\`, `config.yaml`, `auth\` (its sign-ins), `damsel\` (the lights and the log) |

## Hard limits

- **Never sign it in with your Claude login** (Pro or Max). A Claude subscription is for your own use in Anthropic's
  apps, and your whole PetOS runs on that account. The manager **refuses to start** the proxy while a Claude sign-in is
  in its `auth` folder, and **stops it** if one appears while the controls are open.
- A Discord bot other people use runs on an **API key with a spend limit**, never on a subscription sign-in.
- **OpenAI (Codex, ChatGPT) and Google (Gemini) sign-ins** follow OpenAI's and Google's own terms. Read them and decide
  before you add one; this tool does not decide for you. By default the proxy also sends Codex requests with the
  official Codex app's identifying headers (its `disable-codex-cloaking` setting is off).
- It is third-party code. It listens on 127.0.0.1 only, with plugins, network discovery and the remote console off, and
  it gets none of your keys or tokens from your Windows environment.

## Use it

1. **Install** (once, and only after you have decided to run it): double-click
   [install-cli-proxy-api-20261018.cmd](install-cli-proxy-api-20261018.cmd). It checks the download in
   `Documents\Astra's PetOS Quarantine\cliproxyapi-v8.0.33` against the release's checksum, copies the verified
   `cli-proxy-api.exe` into `%USERPROFILE%\.cli-proxy-api\program\v8.0.33\`, and writes `config.yaml` with a new random
   client key. Then it asks for a **console password** (hidden; press Enter to keep the console off). Nothing is started.
2. **Open the controls:** double-click [cli-proxy-api-20261018.cmd](cli-proxy-api-20261018.cmd). Turn the tool **ON**
   (left light green), then press **Start**. That click is the first run. Windows may warn that the program is from
   the internet and unsigned; that is true.
3. **Open console** works once the proxy runs and a console password is set. On its first visit the proxy downloads
   the console page from its official repository and never updates it by itself after that.
4. **Stop** stops the copy this tool installed, and only that copy. **Close these controls** closes the page server;
   the proxy keeps running or stopped as it was.

The same from a terminal: `node cli-proxy-api-manager-20261018.mjs check | install | console-key | on | off | start | stop | open`.

## What the tool checks before Start

| Check | Why |
|---|---|
| The tool is ON | The kill switch. OFF also stops a running proxy. |
| The installed exe's SHA-256 is the verified v8.0.33 | A changed or newer program is not started until it is checked the same way. |
| `server.host` is `127.0.0.1` | The sample config listens on every network card. |
| A client key, not a sample one, at least 24 characters | The sample ships guessable keys (`your-api-key-1`). |
| `management.allow-remote` is off; the console comes from the official repository | The console can change everything. |
| `plugins.enabled` and `server.discovery.enabled` are off | Plugins are third-party code inside the proxy; discovery announces it on the network. |
| No Claude sign-in in its `auth` folder | The hard limit above. |
| Nothing else uses port 8317 | So the health light means this program. |

Request logs (prompts and answers written to disk), a debug server and a GitHub token in the config are shown as
warnings.

## Limits

- **First run 2026-10-19** (card 006): v8.0.33 accepted this config and started on `127.0.0.1` only, with no sign-ins.
  Its log is `%USERPROFILE%\.cli-proxy-api\damsel\proxy.log`. At start it fetches the newest Antigravity and Grok CLI
  version numbers from the internet, then every 3 hours.
- ON/OFF is enforced by this tool, not by Windows: running `cli-proxy-api.exe` by hand bypasses it, and the Claude
  check while it runs works only while the controls are open.
- The maintenance light stays on this PC; it does not reach the Friendly Farmer's `broken-tools-on-the-farm` yet.
- One version only. A new release goes through quarantine again (download, checksum, Astra's OK), then
  `release-20261018.json` is updated in a new dated file.
- Windows only.

Written by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-18, at Astra's request. MIT license, as the rest of this repo.
CLI Proxy API itself is © router-for-me, MIT license.
