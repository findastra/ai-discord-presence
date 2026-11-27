# Remember sharing and coordinate display turns

By Astra. Implemented with OpenAI Codex, 2026-11-27.

Both apps save Off, Automatic and Manual separately from config, restore the last chosen mode on launch, and participate in expiring display turns. Anthropic settings that change the mode persist it too. Standalone installs work without the optional sibling coordinator. Both downloads rebuilt. Full tests: 120 passed. A real HTTP Automatic choice survived shutdown and launcher restart without --automatic.

Read-only checker reviewed the behavior and found no remaining blockers. The three enabled apps (OpenAI, Anthropic and Ableton) each reported a card accepted by Discord during a 40-second branch test; all retained Automatic. This verifies sequential publishing, not simultaneous profile visibility. No UI redesign. Main integration and canonical installation update await owner approval.
