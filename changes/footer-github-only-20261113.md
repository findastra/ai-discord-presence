# The unified footer keeps only the GitHub link (2026-11-13)

Astra, 2026-11-13: "on the unified footer, remove all of the social media links except for the GitHub one."

The footer reads By Astra, a sparkle, her photostar, a sparkle, Find Out More, then the GitHub icon
(https://github.com/findastra). Mommy's Discord, VR TikTok, Pole Dance TikTok and VRChat Instagram are gone. The
spacing and the order are unchanged.

- `openai-discord-presence/public/index.html` and `anthropic-discord-presence/public/index.html`: the footer's Find Out More holds only her GitHub.
- `downloads/*.zip`: the same change inside each ZIP's `public/index.html`. Every other file in the ZIPs is byte for byte the same as before.

The same change went to every repo with the footer: astras-pet-os (the master), findastra.github.io, lunas-log,
vscode-angel, api-fairy, platform-platypus, ghost-protocol, unity-unicorn, ai-discord-presence and
ableton-live-discord-presence, one pull request each; Spoonfed's copy is in findastra/spoonfed#12.

Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-13.
