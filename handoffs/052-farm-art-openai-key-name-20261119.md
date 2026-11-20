# 052 · Farm art OpenAI key gets its own name (2026-11-19)

Status: open (waiting on Astra: merge, then copy the key to the new name)

## What I did

- `image-bridge/imagine.mjs` reads `FARM_ART_OPENAI_API_KEY` first and falls back to `OPENAI_API_KEY`, so nothing
  breaks before the key is moved.
- `image-bridge/README.md` setup step names the new variable.

Why: Astra's answer in the key safety deck (2026-11-19, "all recommended"): Codex and other tools read
`OPENAI_API_KEY`, so the pet art key gets its own name, matching the hub's key-request rule.

## Still to do (Astra)

- Copy the key's value to `FARM_ART_OPENAI_API_KEY` as a Windows user variable, then delete `OPENAI_API_KEY`.
- The PC's loose `image-bridge` folder (not a repo) is a copy of this one; refresh it after the merge, or the hub's
  `npm run generate` keeps using the fallback name.

Claude Opus 5.5 (`claude-opus-5-5`), 2026-11-19.
