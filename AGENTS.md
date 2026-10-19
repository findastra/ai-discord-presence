# Discord Damsel

Part of Astra's PetOS. Public credit: Astra.

**Before any work, read in full:** this repo's `AGENTS.md`, `CLAUDE.md`, every `SKILL.md` on every
branch (`git ls-remote --heads origin`), `handoffs/` and `pet.json`, then everything in the
"Before any work" list in [findastra/astras-pet-os AGENTS.md](https://github.com/findastra/astras-pet-os/blob/main/AGENTS.md),
including the ASTRA_PET_OS architecture. No skimming or partial reads. Say in your first reply which files you read.

Keep existing product behavior and source intact. The pet interface is findastra-discord-presence-20261008.html; metadata is pet.json. Never commit credentials, personal health or finance data, local settings, caches, or logs. Imported or user-entered text must be rendered as text, not HTML. State integration limits plainly. New filenames use lowercase words and a date immediately before the extension.

Pet interface and art integration: OpenAI Codex (GPT-6), 2026-10-08.

Desktop artwork and size sync: OpenAI Codex (GPT-6), 2026-10-11. Read https://raw.githubusercontent.com/findastra/astras-pet-os/main/desktop-art/discord-damsel/desktop-pet-20261011.json. No sparkles. Keep draft and approved design status explicit.

Discord Damsel given Mommy's Mommies' body-to-head ratio (longer gown) in desktop-art and pet-art by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-17, at Astra's request. Record: `findastra/astras-pet-os` docs/pet-art-redesign-20261017.md.

Pictures moved to the hub (one art source, Flash Audit A58, Astra 2026-10-18): every picture of Discord Damsel lives only in [findastra/astras-pet-os](https://github.com/findastra/astras-pet-os) (`art/frames/discord-damsel/`, `desktop-art/discord-damsel/`); this repo links to them and keeps no copy, so change a picture there, never here. By Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-18.

Sticker Manager (`discord-tower-v1.0-sticker-manager-v1.0`, in `discord-damsel-servers-module`): a BetterDiscord plugin in `discord-tower/sticker-manager/` that lists every server Astra is in with its stickers and resets her favorite stickers to the ones she picks, by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-18, at Astra's request. It changes only the favorite stickers, after she confirms, through Discord's own settings saver; keep it free of its own network requests and of any token (`test/sticker-manager-20261018.test.mjs` checks). Handoff card 005.

CLI Proxy API manager (`discord-tower-v1.0-cli-proxy-api-v1.0`, in `discord-tower/cli-proxy-api/`): installs the verified CLI Proxy API release (third-party, router-for-me) from quarantine, keeps it on 127.0.0.1, and starts and stops it from a control page on 127.0.0.1:38763, by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-18, at Astra's request. Never sign the proxy in with Astra's Claude login: the manager refuses to start while one is in its folder; keep that check and the 127.0.0.1-only config (`test/cli-proxy-api-20261018.test.mjs`). A newer release goes through quarantine and Astra's OK before `release-20261018.json` changes. Handoff card 006.

Connection boxes for Token Toucan and Proxy Axolotl in `discord-damsel-L2-module` on her page (the planned read-only grants `toucan-reads-cli-proxy` and `axolotl-reads-cli-proxy`, astras-pet-os#101), and the README's Connections note, by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-19. Both switches start OFF; keep the boxes in step with the hub's `system-map.json` and the two pets' READMEs (`test/cli-proxy-connections-20261019.test.mjs`).

Panels, not modules (Astra, 2026-10-19; astras-pet-os#111): a bordered box on a page is a **panel**, because to a developer a module is a file of code. Her boxes are now `discord-damsel-servers-panel` (the Sticker Manager's, plugin 1.0.1, pet.json `panel`) and `discord-damsel-L2-panel` (`<details class="panel">` on her page), by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-19. The Sticker Manager and connection-box lines above keep the names they were written with. Webpack modules and `module.exports` in the plugin are real modules and keep the word. `test/sticker-manager-20261018.test.mjs` and `test/cli-proxy-connections-20261019.test.mjs` check the panel names.
