status: open (for Codex: the BetterDiscord recovery tool says "Repair needed" while BetterDiscord v1.14.3 works)
for: codex
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-19
needs: tools/discord-damsel-20261015.py (on codex/l3-activity-20261016, codex/discord-tower-interface-20261015 and claude/rescue-damsel-unsaved-20261017: PRs #12, #11 and #10), handoffs/005-any-sticker-manager-20261018.md
---
## What I did

Claude Opus 5.5, 2026-10-19. Read only: nothing on your branches or PRs was changed or pushed, and nothing on
Astra's PC was changed.

- On 2026-10-19 BetterDiscord v1.14.3 was installed on Astra's PC with the official installer v2.0.0, and it works:
  the Sticker Manager plugin ran inside Discord (card 005).
- What installer v2 left in the Discord that runs (`%LOCALAPPDATA%\Discord\app-1.0.9262\`), read only:
  - `modules\discord_desktop_core-1\discord_desktop_core\index.js` is plain: `module.exports = require('./core.asar');`
  - `resources\app.asar` is gone: Discord's own archive is now `resources\betterdiscord.app.asar`.
  - New: `resources\app\package.json` (`{"main": "./index.js"}`) and `resources\app\index.js`, which starts
    `// BetterDiscord's Injection Script (app.asar method)`, loads `<appData>\BetterDiscord\data\betterdiscord.asar`
    and then hands over to `require("../betterdiscord.app.asar")`.
  - `%APPDATA%\BetterDiscord\data\betterdiscord.asar` is there.
- `health()` in `tools/discord-damsel-20261015.py` (lines 57 to 62, the same on all three branches) counts BetterDiscord
  as loaded only when that `discord_desktop_core\index.js` mentions "betterdiscord". With installer v2 it never does,
  so the tool reports `needs_repair` and "Repair needed: open the installer and choose Install or Repair." while
  BetterDiscord is installed and running.
- Also seen: `app-1.0.9263` appeared at 21:03 while every `Discord.exe` still ran from `app-1.0.9262` (an update half
  downloaded: no `modules\` and an empty `resources\`). `health()` takes the highest `app-*` folder, so during a
  download it looks at a folder Discord does not run yet.
- **Correction, 22:45 the same day:** I first wrote here that BetterDiscord would stay behind in 1.0.9262. It did not.
  1.0.9263 finished downloading at 22:03:27, and at that second BetterDiscord hooked itself into it. It renamed that
  folder's `resources\app.asar` to `betterdiscord.app.asar` and wrote a shorter `resources\app\index.js` (136 bytes),
  which requires `<appData>\BetterDiscord\data\betterdiscord.asar\main.js` (a full path) and then
  `../betterdiscord.app.asar`. Both loaders mention "betterdiscord", so a check of `resources\app\index.js` sees
  either one. Discord still ran from 1.0.9262 at 22:45, so this is seen in the files only.

## Task
In `tools/discord-damsel-20261015.py`, on your own branch:
1. Count a channel as loaded when either way is in place: the old one (`discord_desktop_core\index.js` mentions
   betterdiscord) or installer v2's (`resources\app\index.js` mentions betterdiscord and
   `resources\betterdiscord.app.asar` exists). Keep the `data\betterdiscord.asar` check.
2. Look at the `app-*` folder Discord runs from: the newest one whose `resources\` holds `app.asar`,
   `betterdiscord.app.asar` or `app\`, not a half-downloaded one (or the folder of a running `Discord.exe`).
3. Say which way it found, for example "loader present (installer v2: resources\app)".
4. Tests with a pretend `%LOCALAPPDATA%\Discord`: the old way, installer v2, BetterDiscord's own re-hook after an
   update (the 136-byte `index.js` above), plain Discord, and a half-downloaded newer `app-*` folder.

## Done when
On Astra's PC with BetterDiscord v1.14.3 the tool says the loader is present, and it says "Repair needed" for a plain
Discord with no loader.

## Return
Update `## What I did`, set `status: done`, commit on your `codex/` branch.
