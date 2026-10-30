# Presence launcher repair

Astra requested on 2026-10-30: "get it working" after the OpenAI presence card disappeared and the controls still appeared on.

Implementer: OpenAI Codex, presence-diagnosis session. Reviewer: root Codex session.
State: READY_FOR_REVIEW. This branch changes only the two apps' `src/launch.js`, their launcher regression tests, the two rebuilt download ZIPs, this record and handoff 050 (pull request #50).

The launcher exited successfully without doing anything when its command-line path passed through a Windows directory junction. Node resolves the module path to its real location, while the launcher compared it with the unresolved command-line spelling.

The launcher now compares canonical paths, respecting Windows' case-insensitive paths. Normal imports, existing installation/build checks and user-controlled sharing modes stay intact. The new regression checks run the actual module entrypoint through a real junction or symlink with a simulated status response, without contacting Discord or starting a companion.

Validation: the two junction regressions failed before the repair and pass afterward; the full `node --test` suite passes all 108 tests. Both ZIPs were rebuilt with `node scripts/package.mjs`; each has 21 allowlisted files, its launcher exactly matches the tested source, and neither contains local state or development records. The previous ZIPs predated main's website-card change (#49), so rebuilding also packages that existing opt-in feature. No local configuration is included.

No main-branch source or startup preference has been changed. Integration and independent review remain pending; see `handoffs/050-presence-launch-junction-20261030.md`.
