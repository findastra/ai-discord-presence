@echo off
rem Discord Damsel: start OpenAI and Anthropic Discord Presence in Automatic, then open her page.
rem Each app keeps running in the background with its tray icon. Already-running apps are reused.
setlocal
cd /d "%~dp0"
set "PRESENCE_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "PRESENCE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "FAILED="
"%PRESENCE_NODE%" openai-discord-presence\src\launch.js --background --automatic
if errorlevel 1 set "FAILED=1"
"%PRESENCE_NODE%" anthropic-discord-presence\src\launch.js --background --automatic
if errorlevel 1 set "FAILED=1"
start "" "%~dp0findastra-discord-presence-20261008.html"
if defined FAILED (
  echo.
  echo One of the presence apps did not start. The message above says why.
  pause
)
