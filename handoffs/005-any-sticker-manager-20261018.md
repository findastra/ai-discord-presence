status: open (waiting on Astra: install BetterDiscord and the plugin, then the first test inside Discord)
for: any
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-18
needs: AGENTS.md, CLAUDE.md, discord-tower/sticker-manager/README.md, test/sticker-manager-20261018.test.mjs
---
## What I did

Claude Opus 5.5, 2026-10-18. Astra asked for Discord Damsel to have "a module that shows me every single server that I
am a part of", each opening to show its stickers, with a tool inside it, the Sticker Manager, to pick stickers from
other servers and reset her favorite stickers to them.

**This repo, branch `claude/sticker-manager-20261018`** (from `main` at `3de1c19`; not on `main` until Astra merges):
- `discord-tower/sticker-manager/discord-damsel-sticker-manager-20261018.plugin.js`: a BetterDiscord plugin
  (`DiscordDamselStickerManager` 1.0.0). Its settings panel is the module `discord-damsel-servers-module`: every server
  in Discord's server-list order, a `<details>` per server that draws its stickers when opened, search by server or
  sticker name and tag. Inside it the tool box `discord-tower-v1.0-sticker-manager-v1.0` with its two lights (ON/OFF,
  maintenance), the favorites now, the picks, **Reset my favorites to these N** (confirmation first), **Start from my
  favorites**, **Clear picks** and **Put back my previous favorites** (a copy saved before every reset).
- How it reaches Discord: `BdApi.Webpack.getStore` for `GuildStore`, `SortedGuildStore`, `StickersStore`,
  `UserSettingsProtoStore`; the favorites saver is the module whose `ProtoClass.typeName` ends in
  `.FrecencyUserSettings` (the same filter as Vencord's `src/webpack/common/userSettings.ts`), called as
  `updateAsync("favoriteStickers", proto => { proto.stickerIds = [...] }, INFREQUENT_USER_ACTION)`, then read back.
  If Discord hands over no favorites list, or does not keep the new one, it says so and changes nothing.
- `discord-tower/sticker-manager/README.md`: what it does, install steps, what it touches, limits.
- `test/sticker-manager-20261018.test.mjs` (12 tests: helpers, fake Discord stores, the save path, no requests, no
  token, no HTML) and `test/sticker-manager-harness-20261018.html` (the real plugin with a pretend BdApi and pretend
  servers; `?empty`, `?broken`, `?demo`).
- `docs/images/sticker-manager-20261018.png`: the test page with `?demo` (headless Edge), used in the README.
- `pet.json` (tool entry), `README.md` (tool row, section, L1 line), `findastra-discord-presence-20261008.html` (a tool
  card that links the plugin), `AGENTS.md` (credit line), this card and `handoffs/README.md`.
- Tested: `node --test` at the repo root; in the Claude app's browser, the test page: open and close servers, pick,
  reset with the confirmation, put back, OFF, search, `?empty` and `?broken`. Found and fixed there: the status line
  scrolled out of view, the pinned tool box's label was clipped, and a "no match" line showed under a real error.

**`findastra/astras-pet-os`:** the decision row (new-pet-or-tool), the Discord Damsel row in INTELLIGENCE-LEVELS.md
and the System Map entry are on the hub branch `claude/sticker-manager-record-20261018` (its own pull request).

**Astra's PC:** nothing installed. Discord desktop 1.0.9262 had no BetterDiscord loaded and there was no
`%APPDATA%\BetterDiscord` folder (read only). I worked in a git worktree in Claude's scratchpad, not in
`%USERPROFILE%\Documents\Astra's PetOS\findastra-discord-presence` (that copy is on Codex's
`codex/l3-activity-20261016` with uncommitted work; untouched). A test-server line I added to
`Documents\Astra's Pet Apps\.claude\launch.json` was removed again.

## Not done
- **Never run inside Discord.** BetterDiscord was not installed, and a plugin file written from a Claude session into
  `%APPDATA%` would land in the Claude app's private copy, not the real folder. Astra installs both (README steps).
- Whether Discord accepts a favorites list from servers the account cannot use without Nitro is not checked.
- The page card is on `main`'s page. PR #11 (Codex's page rewrite) and PR #7 (Press Plai) change the same page:
  whichever merges after this one carries the Sticker Manager card into the new page.
- The maintenance light stays in the plugin's own data; it does not reach the Farmer's `broken-tools-on-the-farm`.
- Not a mirror on Damsel's own page: the server list shows inside Discord only. A copy on her page would need the
  plugin to send the list to a local Damsel server; not built.

## Task
After Astra installs BetterDiscord and the plugin: open its settings, check that the server count matches her server
list, open a few servers, pick two stickers, reset, and check Discord's sticker picker (Favorites) shows exactly those.
Then **Put back my previous favorites** and check again. If a step fails, the plugin's status line says what it could
not find; fix the filter in the plugin on a branch, with a test.

## Done when
Astra has reset and put back her favorites once inside Discord, and this card says so with the date.

## Return
Update `## What I did`, set `status: done`, commit on a `claude/` or `codex/` branch.
