# Findastra Discord Presence

*By Astra.* Rules for AI assistants. Claude also reads [CLAUDE.md](CLAUDE.md); Codex reads this file and CLAUDE.md.

**Before any work, read in full:** this repo's `AGENTS.md`, `CLAUDE.md`, `ADDING-A-MODEL.md`, every `SKILL.md` on
every branch (`git ls-remote --heads origin`) and `handoffs/`, then everything in the "Before any work" list in
[findastra/astras-pet-os AGENTS.md](https://github.com/findastra/astras-pet-os/blob/main/AGENTS.md). No skimming or
partial reads. Say in your first reply which files you read.

This repo holds only the two presence apps, `openai-discord-presence/` and `anthropic-discord-presence/`, their galaxy
art and the image bridge that makes it, and the guide to add another AI (Astra, 2026-10-28). The pet that manages it
keeps her own files and tools in `findastra/discord-tower`; never add them, or notes about them, here. Keep existing
product behavior intact. Never commit credentials, local settings, caches or logs. Detection reads metadata only
(CLAUDE.md, Privacy). New filenames use lowercase words and a date immediately before the extension.

Built with:
- OpenAI Discord Presence: OpenAI Codex (GPT-6), from 2026-09-12 ([its development record](openai-discord-presence/DEVELOPMENT.md)).
- Anthropic Discord Presence, the two apps in one repo, the galaxy art and the image bridge: Claude Opus 5.5
  (`claude-opus-5-5`), 2026-10-06 to 2026-10-17 ([card 002](handoffs/002-any-claude-presence-chat-wrapup-20261017.md)).
- Chat and session names and the 6-second shuffle: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-14. Sub-chats named by
  their top-level chat: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-18.
- Presence only, with the other tools moved out and the two old repos turned into "Moved" pages: Claude Opus 5.5
  (`claude-opus-5-5`), 2026-10-28, at Astra's request.
