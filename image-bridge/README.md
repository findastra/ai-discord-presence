# Image Bridge

*A tool of Discord Damsel (Discord Tower), by Astra.* It lets an assistant generate images on its own with OpenAI's image model (`gpt-image-2` by default), look at them and keep refining, with no clicking. It also holds the galaxy art tools for the two presence apps.

| File | What it does |
|---|---|
| `imagine.mjs` | Generates an image from a prompt, optionally guided by reference images. Used by the pet art scripts in `astras-pet-os` (`scripts/generate-pets.mjs`, `scripts/generate-seeds-20261012.mjs`). |
| `galaxy-renderer.mjs` | Draws a galaxy in code with a set number of arms (`ARMS=<n>`). Used as the layout reference when a new model generation adds an arm. |
| `center.mjs` | Moves the galaxy's core to the exact centre of the square; optional colour boost. |
| `galaxy-tools.mjs` | `saturate`, `fit` (fill the square), `stars` (background stars), `gif` (seamless real-galaxy swirl). |
| `masters/` | The two generated source images the shipped art is built from. |

The full recipe, with every prompt and command, is in [docs/galaxy-art-20261017.md](../docs/galaxy-art-20261017.md).

## One-time setup

1. Sign in at https://platform.openai.com and add a payment method under **Billing**. The API is billed per image, separately from a ChatGPT subscription. Set a monthly limit there.
2. Create a key at https://platform.openai.com/api-keys, named for what uses it (for example `image-bridge-desktop-2026-10`). Treat it like a password: never paste it into a chat, a repo file or a screenshot.
3. Store it as an environment variable (no typing errors possible this way): **Start** → type `environment` → **Edit environment variables for your account** → **New…** → name `OPENAI_API_KEY`, value: the key (starts with `sk-`, no quotes or spaces) → **OK**, **OK**.
4. Restart the assistant app so it sees the new variable.

To turn the bridge off, delete the variable or delete the key on the OpenAI site.

## Use

```sh
node imagine.mjs "a prompt" out.png
node imagine.mjs "same style as this" out.png --ref style.png
node imagine.mjs "wide banner" banner.png --size 1536x1024 --quality medium
```

`IMAGE_MODEL` overrides the model. The key is read from the environment only; the scripts never print, log or save it. Each image is billed to the account that owns the key; regenerate one image, not a whole set.

## Limits

- Needs an OpenAI API key with billing; nothing is generated without it.
- Generated images are usable under OpenAI's terms; check them before any commercial use.
- `center.mjs` and `galaxy-tools.mjs` read 8-bit RGB/RGBA, non-interlaced PNGs only.
- The galaxy GIFs are large (the 54-second loop has 432 frames); keep each under 10 MB.

Built with Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-06 to 2026-10-08; moved into this repo 2026-10-17.
