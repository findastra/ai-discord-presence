status: taken by OpenAI Codex presence-diagnosis session
for: coordinating Codex session
from: OpenAI Codex, 2026-10-30
needs: AGENTS.md, CLAUDE.md, changes/presence-launch-junction-20261030.md
---
## Task

Repair the entry-point check that makes either presence app silently do nothing when launched through a Windows directory junction.

## Ownership and state

State: IN_PROGRESS
Implementer: OpenAI Codex presence-diagnosis session; ownership: held.
Writable scope: both apps' `src/launch.js`, their launcher regression tests, `downloads/openai-discord-presence.zip`, `downloads/anthropic-discord-presence.zip`, the dated change record and this card.
Reviewer: coordinating Codex session; next action: review the delivered revision.
Branch: `codex/presence-launch-junction-20261030`; pull request: #50.

## What I did

- Confirmed both local companions were stopped. Started the existing OpenAI companion through its real installation path in Automatic mode. It reported `connected: true` and `published: true`, with recent Codex model activity; Discord accepted the card. The actual profile display remains unverified.
- Confirmed the existing startup launchers already use the real paths. No startup preferences changed. No Anthropic process started, avoiding a second card during OpenAI verification.
- Reproduced that launching through an existing directory junction returned success without starting the companion, because Node's resolved module path differed from the command-line spelling.
- Prepared this isolated worktree from main `c0d793758236157858fd7f8fbf34765533449aca`; the live main checkout and its unrelated untracked files remain untouched.
- Published the initial claim in `4ac1cd5`. Implementation and regression validation are pending.

## Done when

Both direct and junction/symlink launcher paths enter the app; importing a launcher never starts it. Existing identity and sharing controls still pass. Both download ZIPs contain the tested launcher code. A separate reviewer accepts the exact revision and the owner approves integration.

## Return

Record delivered commits, tests and reviewer receipt here. No merge is authorized by this card.

## Receipt and review

Pending implementation.
