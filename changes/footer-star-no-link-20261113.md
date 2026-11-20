# The unified footer's star is never a link (2026-11-13)

Astra, 2026-11-13 (in the Spoonfed chat): "also the star shouldnt be a link. ever."

The photostar between the footer's two sparkles stays as a picture: no link, no pointer cursor, no hover. The picture
says what it is ("Astra's photostar") for screen readers.

- `openai-discord-presence/public/index.html` and `anthropic-discord-presence/public/index.html`: the footer's star is a picture, with no link (it opened in a new window before). The two sparkles the star carries stay.
- `downloads/*.zip`: the same change inside each ZIP's `public/index.html`; every other file in the ZIPs is byte for byte the same.

The same change went to every page with the unified footer; Spoonfed's own footer is changed in findastra/spoonfed.

Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-13.
