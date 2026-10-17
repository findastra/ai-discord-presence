status: open
for: any (Codex first: most of this is its Discord Tower work)
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-17
needs: AGENTS.md, CLAUDE.md, skills/dm-cleanup/SKILL.md, astras-pet-os AGENTS.md "Before any work" list, branches below
---
## What I did
Astra chose (2026-10-17) to save the unsaved Damsel work on her PC untouched and leave a card for merging it.

- **Branch `claude/rescue-damsel-unsaved-20261017`** (not on `main`): commit `e827e7d` is the uncommitted work found in
  `%USERPROFILE%\Documents\Astra's Pet Apps\findastra-discord-presence` on 2026-10-17, saved exactly as found on top
  of `codex/l3-activity-20261016` (`6579244`): 19 changed files plus the new `start-discord-damsel-20261014.cmd` and
  `openai-discord-presence/test/project-name-test-20261011.js`. The `.bundle` backup file was left out. It was
  committed with a separate git index, so **the PC folder, its branch and its files were not changed**.
- **Branch `claude/presence-names-shuffle-20261014`** (pushed 2026-10-17, not on `main`): 6 commits from a Claude
  session on 2026-10-14 that existed only as a bundle on the PC (renamed chats on the card, a turn for every
  project, Discord rate-limit backoff, the launcher that updates from GitHub). Pushed unchanged.
- **Merged to `main` on 2026-10-17 with Astra's OK:** PR #2 (detector cache, merge `9dc98ef`) and PR #1 (DM cleanup
  trick brought to the 2026-10-16 rules, merge `21f0fec`). `node --test`: 68 of 68.
- Tests on the rescue branch: **not run.** The saved work was never committed or tested by whoever made it.

## Task
Merge the three lines of Damsel work into one branch off current `main`, then a PR for Astra:
1. `codex/l3-activity-20261016` (Codex, 2026-10-16: Discord Tower interface, recovery, L3 activity; already contains
   PR #2's commits),
2. `claude/presence-names-shuffle-20261014` (Claude, 2026-10-14),
3. `claude/rescue-damsel-unsaved-20261017` (the 2026-10-15 unsaved edits, which overlap 1 and 2 in the README,
   both `detector.js`, `launch.js`, `presence.js` and `server.js`).
Keep main's `projectDisplayName` and the cache from PR #2 in `openai-discord-presence/src/detector.js`.
The launcher and README name the folder `Documents\Pet Programs\...`; Astra decided on 2026-10-17 that every repo
lives in **`%USERPROFILE%\Documents\Astra's PetOS\<repo>`** (astras-pet-os AGENTS.md; the folder is still
`Astra's Pet Apps` until File Master's rename plan runs), so use that path.
Run `node --test`, rebuild downloads with `node scripts/package.mjs`, and check the uncommitted
`start-discord-damsel-20261014.cmd` before anyone runs it.

## Done when
One PR holds all three lines, tests pass, the old branches can be deleted with Astra's OK, and the PC folder is back
on `main` with no unsaved changes (only after its owner agrees; never discard the local edits).

## Return
Update `## What I did`, set `status: done`, commit on a branch.
