# 012: The website card (live cards on findastra.github.io)

For: any. Status: open, waiting on Astra's merge of this PR and findastra/findastra.github.io#27.

Astra, 2026-10-29: hook the portfolio's Discord cards to her actual use, without joining any Discord server ("i dont need
to be in any server"), then "Yes, make it" for a public gist.

## What I did

- Made the public gist `findastra/ac8f1fed8d511b51096187a7ec71edc1` with `openai.json` and `anthropic.json`.
- Both apps: `src/web-card-20261029.js` copies the card they show on Discord (title, the two lines, start time) to their
  file in that gist. At most one write per 30 s, a re-write every 5 min while live, and an idle card on Stop and Quit.
- It is on only when the app's `.local/config.json` has `"webCardGist"`. Friends' copies never publish. The token
  comes from `gh auth token` and stays in memory.
- Tests: `test/web-card-test-20261029.js` in both apps. One real write of an idle card to the gist worked.
- Portfolio (findastra.github.io#27): the AI Discord Presence Polaroid reads the gist every 2 minutes. A card newer
  than 12 minutes replaces the card picture.

## Not done

After both merges, on Astra's PC:
1. Pull this repo.
2. Add `"webCardGist": "ac8f1fed8d511b51096187a7ec71edc1"` to each app's `.local/config.json`.
3. Restart both apps (Quit from the tray, then start them again).
