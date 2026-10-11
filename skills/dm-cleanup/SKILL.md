---
name: dm-cleanup
description: Help Astra bulk-delete her own messages in a Discord DM or channel with Undiscord (a browser userscript). Use when she asks to mass delete, wipe or clean up her messages in a Discord chat, or asks for "the tool that deletes all my Discord messages".
---

# DM cleanup (Discord Damsel)

Undiscord deletes **your own** messages in one Discord DM or channel, one by one, from the
Discord website. Step-by-step guide for Astra: [docs/dm-cleanup-20261010.md](../../docs/dm-cleanup-20261010.md).

## What an assistant may and may not do
- **May:** find the official install pages, open them in Brave, check whether Violentmonkey and
  Undiscord are installed, look at her screen (read-only) and say which button to press, and
  explain the log.
- **May not:** click **Delete**, start or speed up a run, type her Discord token anywhere, or
  install the extension or script for her. Deleting messages is permanent and only she runs it.
- Say it plainly every time: it only deletes **her** messages (never the other person's),
  automating a personal account breaks Discord's Terms of Service and can get the account
  banned, and if someone is harassing her she should report and block them **before** deleting,
  so the evidence still exists.

## Setup facts (checked 2026-10-10)
- Tool: [victornpb/undiscord](https://github.com/victornpb/undiscord), version 5.2.6. Install it
  only from [GreasyFork](https://greasyfork.org/en/scripts/406540) (the source the developer
  recommends). Fake copies that steal Discord accounts are common.
- Browser: **Brave** (on this PC; recommended by Undiscord because of Manifest V3). Userscript
  manager: **Violentmonkey**. Works on discord.com in the browser only, never the desktop app.
- On the Violentmonkey install page she must click **Install** (or **Reinstall**). Clicking
  **Close** leaves the script uninstalled. That happened once already.

## Known problem: no 🗑️ button (Discord update, July 2026)
Discord renamed its toolbar classes, so the trash button never appears
([undiscord#805](https://github.com/victornpb/undiscord/issues/805)). The Undiscord window still
loads hidden. Fix: F12 → **Console**, then paste the line below and press Enter. Brave may ask
her to type `allow pasting` first. She has to run it again after every page reload.

```js
document.querySelector('#undiscord').style.display = '';
```

`Cannot read properties of null` means the script is not installed or not running. Check the
Violentmonkey install, then reload with F5.

## Running it
1. Open the DM on discord.com and show the window (see above).
2. Click **me** (Author ID), **current** (Server ID; fills `@me` for a DM), **current** (Channel ID).
   With **Streamer mode** ticked the fields look empty even when filled. That is normal.
3. She clicks **▶ Delete**. "You must fill the Server ID field" means step 2 was skipped.
4. Keep the tab open and don't reload it. If the run stops, she can click Delete again and it
   carries on with the messages that are left.

## Speed
Defaults are **delete delay 1000 ms** and **search delay 30000 ms**. The 30 s wait between
pages of results is the main slowdown. The measured rate on 2026-10-10 was about 120 messages
in 5 minutes, with about 45 minutes for roughly 1,000. To go faster: **Stop**, then
**Advanced settings**, set search delay `10000` and delete delay `500`, then **Delete** again.
Going lower mostly earns rate limits and makes a ban more likely. Never run two tabs at once.
