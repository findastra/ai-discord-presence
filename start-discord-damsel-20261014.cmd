@echo off
rem Discord Damsel: update from GitHub, start OpenAI and Anthropic Discord Presence in Automatic, open her page.
rem This folder is the one installed copy. Older copies elsewhere are asked to quit (--replace).
setlocal
cd /d "%~dp0"
if "%~1"=="--no-update" goto start

rem 1. Update: only on main, only with no local changes, only fast-forward. Never discards anything.
where git >nul 2>nul
if errorlevel 1 goto start
set "BRANCH="
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%b"
if not "%BRANCH%"=="main" (
  echo Not updating: this folder is on branch "%BRANCH%", not main.
  goto start
)
git diff --quiet 2>nul && git diff --cached --quiet 2>nul
if errorlevel 1 (
  echo Not updating: this folder has local changes. Commit or discard them to get updates again.
  goto start
)
git pull --ff-only --quiet
if errorlevel 1 echo Could not update from GitHub. Starting the copy that is here.
rem Run the (possibly updated) launcher again from the top: cmd reads a .cmd file while running it.
"%~f0" --no-update

:start
set "PRESENCE_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "PRESENCE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "FAILED="
"%PRESENCE_NODE%" openai-discord-presence\src\launch.js --background --automatic --replace
if errorlevel 1 set "FAILED=1"
"%PRESENCE_NODE%" anthropic-discord-presence\src\launch.js --background --automatic --replace
if errorlevel 1 set "FAILED=1"
start "" "%~dp0findastra-discord-presence-20261008.html"
if defined FAILED (
  echo.
  echo One of the presence apps did not start. The message above says why.
  pause
)
