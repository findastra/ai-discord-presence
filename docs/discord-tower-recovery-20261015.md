# Discord Tower recovery and shared interface

By Astra. OpenAI Codex (GPT-6), 2026-10-15. Branch source, not a new release.

Run `python tools/discord-tower-server-20261015.py --open` on Windows with Python
3.10 or newer. The server binds only to loopback, serves the Pet Program, and exposes
fixed status/check/download/open-installer/open-manager/open-discord actions. Host,
Origin and a custom action header are checked. No arbitrary command endpoint exists.
Do not expose this server to a network or treat its checks as OS isolation.

The Discord cloud requests the registered Discord application URI. The BetterDiscord
cloud opens the checksum-verified installer; BetterDiscord is a Discord modification,
not a separate app. User installation/repair and any installer agreement remain
manual. The recovery utility checks the latest installed Discord channel version,
loader marker and BetterDiscord archive. These checks do not prove the mod works
inside Discord. Missing files or a new broken signature trigger official-installer
recovery, with a cross-process lock and 30-minute retry backoff. The GUI can manage
plugin/theme imports and verified park/restore backups. No credentials are read.

The original yellow phone opens Damsel's disconnected chat. Paired left lights:
green/red enables/disables page actions; blue/orange is the owner's manual maintenance
flag. The top installer shortcut uses the same OFF gate. OFF on this page does not
stop a separately installed startup watcher or an installer already opened.
Automatic loader failure is separate from the manual light and feeds the emotion key.
Unknown question/notification queues stay unknown. Never infer a live L3 connection,
protected kill switch, or native click binding from this UI.

Notes/backlog stay in browser storage. Export before changing browsers or origins.
Import merges entries by ID, preserves existing OFF/maintenance state, and rejects
wrong schemas. This does not send notes to the Farmer. No weekly job is installed.

Third-party icon images were extracted from the installed Discord app and official
BetterDiscord installer solely to identify their launchers; trademarks belong to
their respective owners. Presence-control icons reuse this repository's original
OpenAI and Anthropic galaxy artwork. No third-party icon implies affiliation.

Validation: Node state-contract tests, Python recovery tests and loopback server
boundary tests. Live browser verification covers layout and OFF gates; actual Discord
profile rendering, BetterDiscord installation, device click bindings and provider
connections still require separate acceptance.
