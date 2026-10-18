@echo off
rem Discord Tower: starts the Press Plai Ask Astra bot (see docs\press-plai-ask-astra-bot-20261017.md).
rem It answers only while this window is open.
cd /d "%~dp0discord-tower\ask-astra-bot"
where node >nul 2>nul || (echo Node.js 24 or later is needed: https://nodejs.org/en/download & pause & exit /b 1)
if not exist node_modules (
  echo First start: installing the bot's two libraries, discord.js and the Anthropic SDK...
  call npm.cmd ci --omit=dev --no-fund --no-audit || (pause & exit /b 1)
)
node bot-20261017.mjs
pause
