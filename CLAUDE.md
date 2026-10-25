# Rules for this repo

**Before any work, read [AGENTS.md](AGENTS.md) and every file its "Before any work" list names, in full,
including every SKILL.md on every branch. Never skim or skip them.**

Findastra Discord Presence holds one Windows app per AI company: `openai-discord-presence/` and `anthropic-discord-presence/`, each its own download. More can be added (see [ADDING-A-MODEL.md](ADDING-A-MODEL.md)). Read this before changing anything; `node --test` at the repo root runs every app's tests plus the naming rules.

This repo is the pet **Discord Damsel**; her home (pet program) is **Discord Tower** (names come only from `pet-programs.json` in `findastra/astras-pet-os`). On Astra's PC it lives in `%USERPROFILE%\Documents\Astra's PetOS\findastra-discord-presence` (the folder rule in `astras-pet-os/AGENTS.md`; on 2026-10-17 the copy was still under its old name, waiting to be moved) (one working copy; work on a `claude/<topic>-YYYYMMDD` branch and push before you stop). Open handoff cards: [handoffs/](handoffs/README.md).

## High-level decisions
- Before naming, structuring or publishing anything, look at the owner's other repos on github.com/findastra and follow their conventions (lowercase-hyphen repo and folder names; README title is the same words in Title Case).

## Naming
- Each app is named `<company>-discord-presence`, titled "<Company> Discord Presence" (e.g. OpenAI Discord Presence, Anthropic Discord Presence). Its folder, download ZIP, unzip folder and start file use that name.
- User-facing text pairs the companies symmetrically: "OpenAI ___" / "Anthropic ___" (e.g. "exact OpenAI model" / "exact Anthropic model", never "Claude model").
- Keep real product and model names where they describe what is detected: Codex, Claude Code, GPT-6 Astra, Claude Opus 5.5.
- Discord card titles are the company: "OpenAI", "Anthropic" (sent in the activity `name` field; Discord rejects brand names as registered application names).

## Art
- Original galaxies only (never art captured from a company's site). One arm per current model generation: OpenAI 6 (GPT-6), Anthropic 5 (Claude 5). When a new generation ships, re-render with one more arm and bump `?v=` in `GALAXY_URL` (`src/presence.js`) so Discord refetches.
- Each image is centred, fills the square, black background. GIFs stay under 10 MB (GitHub serves larger raw files without an image type).
- The recipe (prompts, commands, swirl physics) is [docs/galaxy-art-20261017.md](docs/galaxy-art-20261017.md); the tools are in [image-bridge/](image-bridge/README.md). Rebuilding from `image-bridge/masters/` reproduces the shipped `galaxy.png` exactly; keep it that way. Generating new images costs Astra money: ask first, regenerate one image, never a set.
- `image-bridge/imagine.mjs` is also used by `astras-pet-os` (`scripts/generate-pets.mjs`, `scripts/generate-seeds-20261012.mjs`). Don't rename or move it without updating those scripts.

## Privacy
- Detection reads local metadata only (model, effort, timestamps, folder). Never read or send conversation text, prompts or automatic chat titles (they are made from what the user typed).
- With project sharing on, a name the user gave a chat or session themselves may be shown (Codex `threads.name`, Claude Code `/rename` records), then a folder's last name, then a saved Codex project name. Nothing leaves the computer unless the user opts in (owner's request, 2026-10-14).
- A Claude desktop chat started from another chat shows its top-level chat's name, never its own (owner's request, 2026-10-18). The link comes from the desktop app's `claude-code-sessions\…\local_*.json`; keep only `cliSessionId`, `spawnedFrom.sessionId` and `lineageDetached` from those files.
- Rotation never goes faster than Discord's limit (about five activity updates per 20 seconds per app); `ROTATE_MS` in `src/presence.js` is 6000.

## Changes
- Add tests with every behaviour change (`cd openai-discord-presence && node --test`). Rebuild downloads with `node scripts/package.mjs` before pushing changes that affect an app.
- Search for references before moving or renaming files or folders.
