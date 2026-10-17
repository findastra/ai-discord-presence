# Galaxy art: how the presence card art is made

By Astra. Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-17. Tools: [image-bridge/](../image-bridge/README.md).

Each app's card art is an original galaxy: **one arm per current model generation** (OpenAI 6 for GPT-6, Anthropic 5 for Claude 5), centred, filling the square, on black, with a seamless swirl that moves like a real spiral galaxy. Approved by Astra on 2026-10-07/08.

## Verified

Running steps 3 and 4 below on `image-bridge/masters/` rebuilds both shipped `public/galaxy.png` files **exactly** (0 differing values of 3,145,728 each), checked 2026-10-17.

## 1. Layout reference (code)

```sh
node image-bridge/galaxy-renderer.mjs amber anthropic-layout.png        # 5 arms, tight, thick, white + orange
node image-bridge/galaxy-renderer.mjs blue  openai-layout.png           # 6 arms, loose, thin, white + blue
ARMS=7 node image-bridge/galaxy-renderer.mjs blue openai-layout.png     # a new generation: one more arm
```

## 2. Generation (image bridge, `gpt-image-2`, quality high, 1024×1024)

Three passes, each using the previous image as `--ref`. Arm counts were checked after each pass.

**Pass 1** (`--ref` = the layout reference). Shared text:

> Hyper-realistic deep-space photograph of a face-on spiral galaxy, centered, on a pure black background with no nebula and no background stars. Use the reference image only for the layout: keep EXACTLY the same number of spiral arms, the same curl direction and the same arm thickness. The arms are made of millions of tiny glittering stars, densest near a brilliant white core and fading outward, with fine dust lanes, star clusters and small crisp four-point sparkles inside the arms, plus a very faint, subtle rainbow shimmer in a few stars. No text, no logo, no frame.

Then Anthropic: *Exactly 5 thick, tightly wound arms. Colour palette: white and warm orange-gold only.* OpenAI: *Exactly 6 thin, long, loosely wound arms. Colour palette: white and blue only.*

**Pass 2** (`--ref` = pass 1), sparkles instead of haze:

> Edit this galaxy image. Keep EXACTLY the same spiral shape, number of arms, curl direction and colour palette. The background must be PURE BLACK: absolutely no stars, dust, haze or glow outside the galaxy. Rebuild the spiral arms so they are made ENTIRELY of distinct, crisp, individual sparkling points of light (thousands of separate glitter sparkles and small four-point star twinkles of varied sizes), with dark black gaps visible between the sparkles. Remove all soft haze, fog, smooth glow and blur from the arms; only a small bright core may glow. Sharp, high-contrast, glittering, like diamond dust on black velvet. No text, no frame.

Centre the result: `node image-bridge/center.mjs pass2.png pass2-centred.png 1024`.

**Pass 3** (`--ref` = pass 2, centred), natural look. The results are `image-bridge/masters/`:

> Edit this galaxy image into a natural, hyper-realistic astrophotograph (like a deep Hubble or JWST exposure). Keep EXACTLY the same spiral shape, number of arms, curl direction, size, centring and colour palette. Make the arms MUCH denser with many more stars: thousands of individual pinpoint stars of naturally varied brightness and size, small bright clusters, and only a few brighter stars with subtle diffraction sparkles. Arms should read as made of real stars, not haze or glitter graphics; allow only a faint natural glow between stars and a small bright core. Keep the background black, but scatter a modest number of small, natural background stars of varied brightness across it (sparse, no nebula, no haze, so the galaxy stays the clear focus). No text, no frame.

## 3. Finish the still (`public/galaxy.png`)

```sh
cd image-bridge
node center.mjs masters/anthropic-galaxy-master-20261007.png a1.png 1024 0.35   # centre, brighter colours
node galaxy-tools.mjs saturate a1.png a2.png 1.3                                 # +30% saturation
node galaxy-tools.mjs fit a2.png a3.png 1024                                      # galaxy fills the square
node center.mjs a3.png a4.png 1024                                                # re-centre after scaling
node galaxy-tools.mjs stars a4.png galaxy.png 900 11                              # OpenAI: 700 23
```

## 4. The swirl (`public/galaxy.gif`, `public/galaxy-card.gif`)

```sh
node galaxy-tools.mjs gif galaxy.png galaxy.gif      240 54 8   # page and README
node galaxy-tools.mjs gif galaxy.png galaxy-card.gif 160 54 8   # Discord card
```

What the swirl does, as Astra asked: the whole picture turns; the rim makes one turn per 54-second loop (3× slower than the first version, then 1/3 of that again); stars follow a flat rotation curve, so the core laps the rim about 6.7 times as fast; the arms trail (direction measured from the image, not set by hand); stars are separate points that brighten inside arms and twinkle at their own rhythm; the loop is seamless.

## 5. Publish

Copy `galaxy.png`, `galaxy.gif` and `galaxy-card.gif` into the app's `public/`, bump `?v=` in `GALAXY_URL` (`src/presence.js`) so Discord fetches the new card art, then `node scripts/package.mjs` and `node --test`.

## Limits

- Generation costs money (billed to Astra's OpenAI account) and is not repeatable: the same prompt gives a different galaxy. Steps 3 to 5 are repeatable from the masters.
- Arm counts in generated images were checked by eye and with a ring-brightness count; check again after any new generation.
- A new generation (step 2) changes the whole picture; it needs Astra's approval before it ships.
