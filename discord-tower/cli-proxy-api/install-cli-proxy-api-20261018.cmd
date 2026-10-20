@echo off
rem Discord Damsel: install CLI Proxy API from quarantine (only the verified release in release-20261019.json, v8.0.34), write a config that keeps it
rem on this PC, and ask for a console password. Nothing is started.
setlocal
cd /d "%~dp0"
set "DAMSEL_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "DAMSEL_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%DAMSEL_NODE%" cli-proxy-api-manager-20261018.mjs install
if errorlevel 1 goto end
echo.
"%DAMSEL_NODE%" cli-proxy-api-manager-20261018.mjs console-key
:end
echo.
pause
