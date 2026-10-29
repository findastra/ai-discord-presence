status: open (waiting on Astra: merge OK for openai-discord-presence#3 and anthropic-discord-presence#3)
for: any
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-29
needs: CLAUDE.md, AGENTS.md, README.md
---
## Task

Astra wants people to find the two apps as repos of their own (2026-10-29). The two app repos become storefront pages;
the code stays here.

## Astra's answers (2026-10-29, "All recommended")

| # | Question | Answer |
| --- | --- | --- |
| 1 | Where should the two apps live? | Storefront pages in `findastra/openai-discord-presence` and `findastra/anthropic-discord-presence`, un-archived; the code stays in this repo. |
| 2 | Own Releases for each app repo? | No: the Download button links to the newest ZIP in this repo's `downloads/`. |
| 3 | New repo descriptions? | OpenAI: "Show your Codex model on your Discord profile. Free Windows app." Anthropic: "Show your Claude Code model on your Discord profile. Free Windows app." |
| 4 | Pin the app repos on her profile? | No: `ai-discord-presence` stays pinned; her profile README already links all three repos. |

## Ownership and state

State: READY_FOR_REVIEW (the two storefront PRs wait on Astra's merge OK)
Implementer: Claude Opus 5.5; writable files: the two app repos' `README.md` and `public/<app>-card-20261029.gif`;
ownership: released
Reviewer: Astra; next action: review and merge the two PRs

## What I did

1. Un-archived both app repos and set the two descriptions above (GitHub settings, 2026-10-29).
2. `findastra/openai-discord-presence#3` and `findastra/anthropic-discord-presence#3`, branch
   `claude/storefront-page-20261029`: `README.md` becomes a storefront page (card animation, Download button, what it
   needs, app picture, four start-up steps, where the code lives, License with the trademark line), and
   `public/<app>-card-20261029.gif` is a copy of this repo's `docs/images/<app>-card-20261029.gif`. Not merged.
3. This repo: this card, `handoffs/README.md`, a `CLAUDE.md` rule that the storefronts carry copies of the card GIFs
   and app pictures (and the PC folder name, which still said findastra-discord-presence), and a "Built with" line in
   `AGENTS.md`.

Not done: no Releases, no pin changes (both by Astra's answers). The two repos' `homepage` settings still point at the
old GitHub Pages page (OpenAI) and the old repo name (Anthropic); both redirect here.

## Done when

Both storefront PRs are merged and each repo's front page shows the card animation, the Download button and the app
picture.

## Return

Record the merges and any fixes under Receipt and review.

## Receipt and review

Pending.
