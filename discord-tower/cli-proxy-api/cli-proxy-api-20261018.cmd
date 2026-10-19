@echo off
rem Discord Damsel: open the CLI Proxy API controls (http://127.0.0.1:38763/).
rem Starts the controls if they are not running. It never starts the proxy itself: Start is a click on that page.
setlocal
cd /d "%~dp0"
set "DAMSEL_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "DAMSEL_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%DAMSEL_NODE%" cli-proxy-api-manager-20261018.mjs open
if errorlevel 1 pause
