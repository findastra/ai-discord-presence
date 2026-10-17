# Delete your messages in a Discord DM

Discord Damsel's guide to **Undiscord**, a free browser add-on that deletes all of *your*
messages in one DM or channel. Assistants follow [skills/dm-cleanup/SKILL.md](../skills/dm-cleanup/SKILL.md).

> **Before you start**
> - It deletes only **your** messages. The other person's messages stay.
> - Deleting is permanent. There is no undo.
> - Discord doesn't allow automating a personal account. Bans for this are rare but possible.
> - If someone is harassing you, **report and block them first**. Deleted messages can't be used as evidence.
> - If they use a message logger, they may already have copies. Deleting can't reach their device.
> - Undiscord is made by someone else (a third-party program, not checked through the Shed). Install it only from
>   GreasyFork.

**Farm rules (2026-10-16):** before you click Delete, an assistant helping you says back exactly what will go (which
DM, which dates, only your messages) and waits for your yes. It also leaves a short note for File Master and GitHub
Goldfish on your PC (date and count only, never names). You are the only one who clicks Delete.

## One-time setup (about 5 minutes)

1. Open **Brave**.
2. Install **Violentmonkey** from the Chrome Web Store: click **Add to Brave**, then **Add extension**.
3. Open the [Undiscord GreasyFork page](https://greasyfork.org/en/scripts/406540) and click
   **Install this script**.
4. On the Violentmonkey page that opens, click the blue **Install** button.
   **Don't click Close.** Close leaves it uninstalled.

## Each time you use it

1. In Brave (not the Discord app), go to **discord.com/app** and open the DM.
2. Show the Undiscord window. The 🗑️ button at the top right is missing since a Discord update in
   July 2026, so:
   - Press **F12** and click the **Console** tab.
   - Paste this line and press **Enter**:
     ```js
     document.querySelector('#undiscord').style.display = '';
     ```
   - If Brave asks, type `allow pasting`, press Enter, and paste the line again.
   - Ignore Discord's red "stop!" warning. This line only un-hides the Undiscord window.
   - Press **F12** again to close the console.
3. In the Undiscord window, click **me**, then the first **current**, then the second **current**.
   With **Streamer mode** ticked the boxes look empty even after you click. That's fine.
4. Click **▶ Delete**.
5. Leave the tab open. The bar at the bottom shows progress and the time remaining.

## Make it faster

It waits 30 seconds between each batch of messages by default. About 1,000 messages takes around
45 minutes. To speed it up:

1. Click **Stop**.
2. Open **Advanced settings**. Set **Search delay** to `10000` and **Delete delay** to `500`.
3. Click **▶ Delete** again. It carries on with the messages that are left.

Don't go lower than that, and don't run it in two tabs. Discord would slow you down anyway, and
it looks more like a bot.

## If something goes wrong

| You see | Do this |
| --- | --- |
| No 🗑️ button | Normal since July 2026. Use the console line in step 2. |
| `Cannot read properties of null` | Undiscord isn't installed. Redo setup step 3–4, then press F5. |
| "You must fill the Server ID field" | Click the **me** and **current** buttons (step 3). |
| Window gone after a reload | Paste the console line again. |
| It stopped partway | Click **▶ Delete** again. |
| "Rate limited" keeps going up | Raise the delays back toward 1000 / 30000. |
