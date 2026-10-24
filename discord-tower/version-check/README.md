# Version check

A helper of **Discord Damsel** (Discord Tower) for the [Sticker Manager](../sticker-manager/README.md). It answers one
question: is a newer BetterDiscord or Sticker Manager out than the ones on this PC?

| | |
|---|---|
| File | [discord-damsel-version-check-20261024.mjs](discord-damsel-version-check-20261024.mjs) (Node 24, nothing to install) |
| Runs | in the background each time [start-discord-damsel-20261014.cmd](../../start-discord-damsel-20261014.cmd) starts Discord Damsel |
| Shows | the Sticker Manager's maintenance light turns yellow, and its tool box says what to update |

## What it does

1. **Reads the installed versions** from this PC's files and changes nothing there:
   - BetterDiscord's, from its own file `%APPDATA%\BetterDiscord\data\betterdiscord.asar`.
   - The Sticker Manager's, from the `@version` line of the plugin in `%APPDATA%\BetterDiscord\plugins`.
2. **Asks GitHub for the newest of each**, with no token and no sign-in:
   - BetterDiscord's latest release, from `api.github.com/repos/BetterDiscord/BetterDiscord`.
   - The plugin file on this repo's `main`, the same file its README tells you to download.
3. **Saves the answer** to `%APPDATA%\BetterDiscord\plugins\DiscordDamselVersionCheck.config.json`. This is a file of
   its own, so it never overwrites the plugin's picks or saved copy. The plugin (1.0.4 and later) reads it each time
   you open its tool panel. It compares the answer with the versions running in Discord at that moment, so the light
   turns blue again as soon as you update.

Offline, or when GitHub does not answer, it saves that it could not ask, and the light stays blue. It never stops
Discord Damsel from starting.

## Run it by hand

```sh
node discord-tower/version-check/discord-damsel-version-check-20261024.mjs
```

It prints one line for BetterDiscord and one for the Sticker Manager, then where it saved the answer. Add `--json` for
the saved answer itself, or `--no-write` to only print. `--plugins-dir` and `--asar` point it at other folders (the
tests use them).

## Why the plugin does not ask GitHub itself

The Sticker Manager promises no network requests of its own, and `test/sticker-manager-20261018.test.mjs` checks
that promise. The asking happens here, outside Discord, and the plugin only reads a file on this PC.

Written by Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-24, at Astra's request ("give Discord Damsel a BetterDiscord
and plugin version check that lights Requires maintenance when a new version is out"). MIT license, as the rest of
this repo.
