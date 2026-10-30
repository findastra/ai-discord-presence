status: open (ready for coordinating Codex review)
for: coordinating Codex session
from: OpenAI Codex, 2026-10-30
needs: AGENTS.md, CLAUDE.md, changes/presence-launch-junction-20261030.md
---
## Task

Repair the entry-point check that makes either presence app silently do nothing when launched through a Windows directory junction.

## Ownership and state

State: READY_FOR_REVIEW
Implementer: OpenAI Codex presence-diagnosis session; ownership: released.
Writable scope: both apps' `src/launch.js`, their launcher regression tests, `downloads/openai-discord-presence.zip`, `downloads/anthropic-discord-presence.zip`, the dated change record and this card.
Reviewer: coordinating Codex session; next action: review the delivered revision.
Branch: `codex/presence-launch-junction-20261030`; pull request: #50.

## What I did

- Confirmed both local companions were stopped. Started the existing OpenAI companion through its real installation path in Automatic mode. It reported `connected: true` and `published: true`, with recent Codex model activity; Discord accepted the card. The actual profile display remains unverified.
- Confirmed the existing startup launchers already use the real paths. No startup preferences changed. No Anthropic process started, avoiding a second card during OpenAI verification.
- Reproduced that launching through an existing directory junction returned success without starting the companion, because Node's resolved module path differed from the command-line spelling.
- Prepared this isolated worktree from main `c0d793758236157858fd7f8fbf34765533449aca`; the live main checkout and its unrelated untracked files remain untouched.
- Published the initial claim in `4ac1cd5`, then numbered ownership card in `c7f591e` before implementation.
- Both `src/launch.js` files now compare real paths for the command-line entrypoint and the loaded module, with case-insensitive comparison on Windows. Imports and absent/non-file entrypoints do not launch an app.
- Added each app's `test/launcher-junction-test-20261030.js`. Subprocesses exercise direct launch, a real Windows directory junction (directory symlink elsewhere), normal imports through that junction, and imports without an entrypoint. Status is simulated with the exact source identity, so no app, browser or Discord connection starts during these checks.
- Regression evidence: before the fix, 6 checks passed and the 2 junction invocation checks failed (`0 !== 2` status calls). After the fix, the whole repository's `node --test` run passed **108 of 108**, including both named-pipe protocol mocks, privacy and identity checks.
- Rebuilt both downloads with `node scripts/package.mjs`; each has **21 allowlisted files** and its launcher matches the tested source byte for byte. No `.local`, tests, change records or handoff files are packed. The previous ZIPs were stale relative to main's #49: the rebuild also includes that already-merged, opt-in website-card code. It ships no local configuration.
- `git diff --check` passed. New repository filenames are lowercase and dated. No main integration or live replacement of source was performed.

## Done when

Both direct and junction/symlink launcher paths enter the app; importing a launcher never starts it. Existing identity and sharing controls still pass. Both download ZIPs contain the tested launcher code. A separate reviewer accepts the exact revision and the owner approves integration.

## Return

Record delivered commits, tests and reviewer receipt here. No merge is authorized by this card.

## Receipt and review

Received and reviewed by the coordinating OpenAI Codex session on 2026-10-30 at `652ad169ff1e5799e4dcfd70b0b6a5b27d3e26fc`. Inspected both launcher diffs, the real-junction subprocess regressions and package contents evidence. Canonical comparison resolves the observed no-op without relaxing installation identity checks or changing sharing preferences; ordinary imports remain inert. No blocking findings. The full 108-test result and red-before/green-after evidence were verified in the implementation report. Source ownership remains released; owner-approved integration is pending. This record-only review update does not change the accepted source or packages.
