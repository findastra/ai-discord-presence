---
name: dm-cleanup
description: Discord Damsel's trick for helping Astra bulk-delete her own messages in one Discord DM or channel with Undiscord (a third-party browser userscript). Use when she asks to mass delete, wipe or clean up her messages in a Discord chat, or asks for "the tool that deletes all my Discord messages".
---

# DM cleanup: a trick of Discord Tower (Discord Damsel)

Trick label: `discord-tower-v1.0-dm-cleanup-trick-v1.0` (pet program #13, Discord Tower; pet: Discord Damsel).
Step-by-step guide for Astra: [docs/dm-cleanup-20261010.md](../../docs/dm-cleanup-20261010.md).

Undiscord deletes **your own** messages in one Discord DM or channel, one by one, from the Discord website.

## Rules this trick follows (astras-pet-os, 2026-10-16)
- **It is a trick, not a tool** ([TOOLS-AND-TRICKS.md](https://github.com/findastra/astras-pet-os/blob/main/TOOLS-AND-TRICKS.md)):
  written steps with no code and no permissions of its own. Skill Scout tracks it.
- **Undiscord is a third-party program** (ring 5): made by someone else, run by Astra in her own browser. It has
  not been through the Shed, so treat it as **community tier, with a warning**. No agent installs it, edits it or
  runs it.
- **Online deleting follows mass-delete** (`skills/farm-security`, section 10, in astras-pet-os):
  1. **Astra approves the exact scope before Delete:** which one DM or channel, which date range (or "all"), and
     that only her own messages go. Write the scope back to her in one line and wait for her yes.
  2. **Notices to File Master and GitHub Goldfish**, once when planned and once when finished: date, run id
     (`dm-cleanup-YYYYMMDD-N`), stage, the number of messages Undiscord reports, and "one DM, own messages".
     **No names, no channel IDs, no message text.** Keep them on the PC only, one JSON line each, in
     `%LOCALAPPDATA%\astras-pet-os\discord-tower\dm-cleanup-notices.jsonl`. No pet reads this file yet; it
     waits for the Farm inbox.
  3. Only Astra clicks **Delete**. Deleting on Discord is permanent; there is no `_to_delete` step online.

## What an assistant may and may not do
- **May:** find the official install pages, open them in her browser, check whether Violentmonkey and Undiscord are
  installed, look at her screen (read-only) and say which button to press, put the show-window line on her
  clipboard, explain the log, and write the notices above.
- **May not:** click **Delete**, start or speed up a run, type her Discord token anywhere, install the extension or
  script for her, or drive the browser to delete. Browsers are read-only for computer use.
- Say it plainly every time: it only deletes **her** messages (never the other person's), automating a personal
  account breaks Discord's Terms of Service and can get the account banned, a message logger on the other side
  may already have kept copies, and if someone is harassing her she should report and block them **before**
  deleting, so the evidence still exists.

## Setup facts (checked 2026-10-10)
- Undiscord: [victornpb/undiscord](https://github.com/victornpb/undiscord), version 5.2.6. Install it only from
  [GreasyFork](https://greasyfork.org/en/scripts/406540) (the source the developer recommends). Fake copies that
  steal Discord accounts are common.
- Browser: **Brave** (recommended by Undiscord because of Manifest V3). Userscript manager: **Violentmonkey**.
  Works on discord.com in the browser only, never the desktop app.
- On the Violentmonkey install page she must click **Install** (or **Reinstall**). Clicking **Close** leaves the
  script uninstalled. That happened once already.

## Known problem: no 🗑️ button (Discord update, July 2026)
Discord renamed its toolbar classes, so the trash button never appears
([undiscord#805](https://github.com/victornpb/undiscord/issues/805)). The Undiscord window still loads hidden: in
DevTools **Elements** it shows as `<div id="undiscord" ... style="display: none;">`. Fix: F12, then the
**Console** tab (not Elements), paste the line below and press Enter. Brave may ask her to type `allow pasting`
first; a SyntaxError after typing it just means pasting was already allowed. Run it again after every reload.

```js
document.querySelector('#undiscord').style.display = '';
```

`Cannot read properties of null` means the script is not installed or not running. Check the Violentmonkey install,
then reload with F5.

## Running it
1. Get Astra's yes on the scope and write the "planned" notice (rules above).
2. Open the DM on discord.com and show the window (see above).
3. Click **me** (Author ID), **current** (Server ID; fills `@me` for a DM), **current** (Channel ID). With
   **Streamer mode** ticked the fields look empty even when filled. That is normal.
4. She clicks **▶ Delete**. "You must fill the Server ID field" means step 3 was skipped.
5. Keep the tab open and don't reload it. If the run stops, she can click Delete again and it carries on with the
   messages that are left.
6. When it finishes, write the "finished" notice with the count from the log.

## Speed
Defaults are **delete delay 1000 ms** and **search delay 30000 ms**. The 30 s wait between pages of results is the
main slowdown. Measured on 2026-10-10: about 120 messages in 5 minutes, about 45 minutes for roughly 1,000. To go
faster: **Stop**, then **Advanced settings**, set search delay `10000` and delete delay `500`, then **Delete**
again. Going lower mostly earns rate limits and makes a ban more likely. Never run two tabs at once.

Written by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-10; brought to the 2026-10-16 rules on 2026-10-17.
