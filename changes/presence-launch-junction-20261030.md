# Presence launcher repair

Astra requested on 2026-10-30: "get it working" after the OpenAI presence card disappeared and the controls still appeared on.

Implementer: OpenAI Codex, presence-diagnosis session. Reviewer: root Codex session.
State: IN_PROGRESS. This branch owns only the two apps' `src/launch.js`, their launcher regression tests, the two rebuilt download ZIPs, this record and its numbered handoff.

The launcher currently exits successfully without doing anything when its command-line path passes through a Windows directory junction. Node resolves the module path to its real location, while the launcher compares it with the unresolved command-line spelling.

The repair will compare canonical paths before running the launcher. It will preserve normal imports, existing installation/build checks and user-controlled sharing modes. Regression checks will exercise a real junction or symlink without contacting Discord or starting a companion.

No main-branch source or startup preference has been changed. Implementation and validation evidence will be recorded in the handoff after the pull request assigns its number.
