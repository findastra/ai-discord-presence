status: open (waiting on Astra: merge #23 and the v8.0.34 pin, then Stop, install v8.0.34 with her console password, Start)
for: any
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-19
needs: AGENTS.md, CLAUDE.md, discord-tower/cli-proxy-api/README.md, discord-tower/cli-proxy-api/release-20261019.json, handoffs/006-any-cli-proxy-api-20261018.md
---
## What I did

Claude Opus 5.5, 2026-10-19, on Astra's OK in chat ("Yes, run it with v8.0.34: download it to quarantine and pin it
first"). Details are in card 006, "Moved to v8.0.34". In short:
- v8.0.34 is in `%USERPROFILE%\Documents\Astra's PetOS Quarantine\cliproxyapi-v8.0.34\`, checked against the
  release's `checksums.txt` and GitHub's own digest. Nothing was run.
- Branch `claude/cli-proxy-v8.0.34-20261019` (stacked on #23's `claude/cli-proxy-first-run-20261019`): the pin is
  `release-20261019.json`, and the manager can stop an older copy it installed, so the v8.0.33 that runs since the
  first run (card 006) stays stoppable after the pin moves. Start waits until it is stopped.
- Astra's PC: the running v8.0.33, its controls and `%USERPROFILE%\.cli-proxy-api` were not touched.

**Its API key is a key request for API Fairy** (Claude Opus 5.5, 2026-10-20). Since 2026-10-19 every chat that needs a
key files one (astras-pet-os `skills/key-request`, card 056 there); card 006's "add an API key with a spend limit in the
console" is filed as `20261018-discord-damsel-cli-proxy-api-key.json` in Astra's
`Documents\Astra's PetOS Data\api-fairy-ring\key-requests\` (on her PC only), and API Fairy Ring's pet program page lists
it under waiting on you. **Astra's answer (2026-10-20): which provider's key it gets is decided when she adds it.** Still
never a Claude login: the manager refuses to start with one.

## Task
1. Astra merges #23 first, then the v8.0.34 pull request (her OK in chat; the assistant merges).
2. A chat fast-forwards `Documents\Astra's PetOS\findastra-discord-presence` to `main` (it is on `main`, with only
   untracked files).
3. Astra, on the controls page that is open now: press **Stop**, then **Close these controls**. That page started before
   the pin moved, so it still knows only v8.0.33.
4. Optional: right-click `Documents\Astra's PetOS Quarantine\cliproxyapi-v8.0.34` and choose **Scan with Malwarebytes**.
5. Double-click `discord-tower/cli-proxy-api/install-cli-proxy-api-20261018.cmd`. It installs v8.0.34 next to v8.0.33,
   keeps `config.yaml`, and asks for a console password: type your own, or press Enter to keep the console off.
6. Double-click `cli-proxy-api-20261018.cmd` and press **Start**. The health line should read
   "CLI Proxy API v8.0.34: Running on 127.0.0.1:8317."
7. A chat checks that `Get-NetTCPConnection -LocalPort 8317` shows `127.0.0.1` only and that `proxy.log` says
   `Version: 8.0.34`, then closes this card. The old `program\v8.0.33\` folder can stay; removing it is Astra's.
8. When Astra adds an API key with a spend limit in the console (her provider, her choice then), a chat sets that key
   request's `"status": "given"` and `"status_date"`: API Fairy can't see inside the proxy's settings, so she only knows
   from the request.

## Done when
v8.0.34 runs from the controls, on 127.0.0.1 only, and this card says so with the date.

## Return
Update `## What I did`, set `status: done`, commit on a `claude/` or `codex/` branch.
