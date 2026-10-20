status: done 2026-10-19 (installed and started on Astra's OK; the console password is still hers to set)
for: any
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-18
needs: AGENTS.md, CLAUDE.md, discord-tower/cli-proxy-api/README.md, discord-tower/cli-proxy-api/release-20261019.json, test/cli-proxy-api-20261018.test.mjs
---
## What I did

Claude Opus 5.5, 2026-10-18. Astra asked for "CLI Proxy API Console" and a pet to manage it, then gave it to Discord
Damsel: "she needs to add it to a module/as a tool" (relayed from the session that downloaded it; its notes are the
memory file `cli-proxy-api-in-quarantine.md`).

**Already done by that session (not this card):** CLIProxyAPI v8.0.33 for Windows x64 from the official release, in
`%USERPROFILE%\Documents\Astra's PetOS Quarantine\cliproxyapi-v8.0.33\` (zip, checksums.txt, extracted\). Never run.

**This repo, branch `claude/cli-proxy-api-20261018`**, stacked on `claude/sticker-manager-20261018` (PR #15), so it
merges after #15:
- `discord-tower/cli-proxy-api/cli-proxy-api-manager-20261018.mjs` (Node, no dependencies): `check`, `install`,
  `console-key`, `on`/`off`, `start`/`stop`, `open`, `serve [--port N] [--demo]`.
  - Install copies `cli-proxy-api.exe` out of quarantine only if the zip's SHA-256 and the exe's SHA-256 match
    `release-20261018.json` (checked 2026-10-18: zip `6a1e0402…`, matches the release's checksums.txt; exe `2df7fcd8…`,
    the same inside the zip and in `extracted\`). It writes `config.yaml` with `server.host: "127.0.0.1"`, a new
    random client key, console off, `disable-auto-update-panel: true`, plugins, discovery, request logs and pprof off.
  - Start refuses when: the tool is OFF (default), not installed or not the verified hash, no config, the config would
    listen beyond 127.0.0.1, has a sample or short key, a remote console, plugins, discovery, a public pprof or another
    console repository, a Claude sign-in is in its `auth` folder, or port 8317 is taken. It passes the proxy only the
    Windows variables it needs (no `OPENAI_API_KEY`, `GITHUB_TOKEN` and the like) and runs `cli-proxy-api.exe -config`.
  - While the controls run, a Claude sign-in that appears, or turning the tool OFF, stops the proxy.
  - Everything on the PC lives in `%USERPROFILE%\.cli-proxy-api\` (program, config, auth, `damsel\` with the lights
    and the log), not in AppData, because the Claude and Codex apps keep a private copy of AppData.
- `control-page-20261018.html`: the tool box (ON/OFF and maintenance lights), health, Start, Stop, Open console, the
  checks and the hard limits. Served only on 127.0.0.1:38763; requests with another Host are refused (DNS rebinding),
  and buttons need the page's own Origin plus `X-Discord-Tower: local-action` (the pattern of Codex's tower server).
- `cli-proxy-api-20261018.cmd` (opens the controls) and `install-cli-proxy-api-20261018.cmd` (install, then the hidden
  console-password prompt). Neither starts the proxy.
- `README.md` in that folder; `docs/images/cli-proxy-api-controls-20261018.png` (demo mode, headless Edge).
- `test/cli-proxy-api-20261018.test.mjs` (17 tests, a pretend PC; the real exe is never started). `node --test` at the
  root: 109 pass.
- Damsel's page: a tool card with an opaque "does anything answer on 8317" probe and links, and a **Third Party
  Programs** card (Flash Audit A54): Discord, BetterDiscord, CLI Proxy API. `pet.json`: the tool and
  `third_party_programs`. README (tool row, section, L1 line), AGENTS.md credit, this card, `handoffs/README.md`.
- Checked in the Claude app's browser with `serve --demo`: OFF by default and Start blocked, ON then Start shows
  running, OFF stops it, phone width. Fixed there: the footer showed the Windows user folder; it now shows `%TEMP%` or
  `%USERPROFILE%` (`shortPath`, tested).
- On PR #15's branch, the Sticker Manager test now reads the plugin with either line ending (`35cd855`; `df7a8ab`
  before it broke the file and was repaired a minute later).

**`findastra/astras-pet-os`:** decision row, INTELLIGENCE-LEVELS made-by-others and the System Map entries are added
to the hub branch `claude/sticker-manager-record-20261018` (PR #93).

**Astra's PC:** nothing installed, nothing started, quarantine untouched (read only). `.claude\launch.json` in
`Documents\Astra's Pet Apps` got a temporary demo entry, removed again. Worked in a scratchpad worktree.

## First run (2026-10-19)

Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-19, at Astra's word in chat ("do it for me", answering whether to install
v8.0.33 now or move to v8.0.34 first). Install and first Start, as the Task below says:
- **Antivirus:** Malwarebytes is the active antivirus on this PC (on, up to date); Microsoft Defender is passive, so
  `Start-MpScan` cannot run (that is also why the 2026-10-18 command-line scan failed). Malwarebytes did not flag the
  file in quarantine. No separate scan was run.
- **Install:** `node cli-proxy-api-manager-20261018.mjs install` from `Documents\Astra's Pet Apps\…`: zip and exe
  matched `release-20261018.json`; the program is in `%USERPROFILE%\.cli-proxy-api\program\v8.0.33\` with
  `config.yaml` and `damsel\settings.json`. `console-key` was **not** run: the console password is Astra's to type, so
  the console stays off.
- **Bug found and fixed in this branch:** started through `Documents\Astra's PetOS\…` (a junction to `Astra's Pet
  Apps`), the manager printed nothing and did nothing. Its start check compared `import.meta.url` (the real path) with
  the path Node was given. `isMainScript` now compares real paths, with a test that uses a real junction.
- **Controls:** `cli-proxy-api-20261018.cmd` started through `explorer.exe`, as a double-click would, so the controls
  and the proxy run as Astra, not inside the Claude app's package. Then the tool was turned ON and **Start** was pressed
  through the control page's own buttons (`/api/enabled`, `/api/start`).
- **Checked:** health `running`; `Get-NetTCPConnection -LocalPort 8317` shows `127.0.0.1` only; this PC's network
  address gets no answer; a request without the client key gets 401. The log shows v8.0.33 started with 0 sign-ins
  and 0 keys.
- **Seen in the log:** at start the proxy fetches the newest Antigravity and Grok CLI version numbers from the internet
  and refreshes them every 3 hours. It sends no prompts. For Proxy Axolotl's egress allowlist later.
- **Not changed:** v8.0.34 came out on 2026-10-19 (Gemini and reasoning-signature fixes, an access-log escaping fix).
  The tool still pins v8.0.33; moving up goes through quarantine and Astra's OK again.

## Moved to v8.0.34 (2026-10-19)

Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-19, on Astra's OK in chat ("Yes, run it with v8.0.34: download it to
quarantine and pin it first"), on branch `claude/cli-proxy-v8.0.34-20261019`, stacked on this card's first-run branch.
The running v8.0.33 was not touched. What is left for Astra is [card 007](007-any-cli-proxy-api-v8.0.34-20261019.md).
- Downloaded `CLIProxyAPI_8.0.34_windows_amd64.zip` (23,894,969 bytes) and `checksums.txt` from the official v8.0.34
  release into a new folder, `%USERPROFILE%\Documents\Astra's PetOS Quarantine\cliproxyapi-v8.0.34\`, and unpacked it
  into `extracted\`. The zip's SHA-256 `f017bef3…` matches `checksums.txt` and GitHub's own digest for the file; the
  exe `32f0b9c9…` (73,104,384 bytes) is not code-signed. Malwarebytes did not flag it; no separate scan was run.
- Its `config.example.yaml` differs from v8.0.33 only by a `web-search-result-cache` block (off by default) and a
  comment on Claude cloak mode: nothing about the network, the console, plugins or discovery.
- The pin is `release-20261019.json`; `release-20261018.json` is removed, so there is one pin. A dry install into a
  scratch folder (real quarantine, never started) verified both hashes and wrote a config with nothing that blocks
  Start.
- Stop, OFF and the Claude guard now reach any copy the tool installed under `program\` (`ownCopy`), so the running
  v8.0.33 stays stoppable once the pin moves; Start waits until it is stopped.

## Not done
- **The console password** (Astra's): press **Stop** on the controls (install cannot replace the program while it
  runs), double-click `install-cli-proxy-api-20261018.cmd` again (it keeps the existing config) and type a new password
  at the prompt, then press **Start**. Until then **Open console** has nothing to show.
- **No account or API key is in it yet**, so it answers nothing useful. Add an API key with a spend limit in the
  console. Never a Claude login: the manager refuses to start with one.
- ON/OFF is enforced by the manager, not Windows: running the exe by hand bypasses it. The Claude check while
  running works only while the controls are open.
- Codex sign-ins: by default the proxy sends the official Codex app's headers (`disable-codex-cloaking` off). Whether
  OpenAI's and Google's terms allow her use is Astra's to decide; this tool flags, never decides.
- The maintenance light stays on the PC; it does not reach the Farmer.
- PR #11 (Codex's page rewrite) replaces the page and the pet.json tool list: whichever merges later carries both
  new tool cards, the Third Party Programs card and both pet.json tools across. The same goes for the Token Toucan and
  Proxy Axolotl connection boxes in `discord-damsel-L2-module` (branch `claude/damsel-cli-proxy-connections-20261019`,
  Claude Opus 5.5, 2026-10-19).

## Task
1. Astra decides whether to run it. If yes: double-click `discord-tower/cli-proxy-api/install-cli-proxy-api-20261018.cmd`
   (she types the console password herself), then `cli-proxy-api-20261018.cmd`, turn the tool ON, press Start.
2. Check the controls say "Running on 127.0.0.1:8317", `Get-NetTCPConnection -LocalPort 8317` shows 127.0.0.1 only,
   and Open console loads after a restart with the password set.
3. If v8.0.33 rejects the config, read `proxy.log`, fix `makeConfig` on a branch with a test.

## Done when
The proxy has started once on Astra's PC from the controls, listening on 127.0.0.1 only, and this card says so with the date.

## Return
Update `## What I did`, set `status: done`, commit on a `claude/` or `codex/` branch.
