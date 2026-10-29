import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { SOURCE_IDENTITY } from './source-identity-20261008.js';
const url = 'http://127.0.0.1:38761/';
const app = 'openai-discord-presence';

export async function launch({ fetcher = fetch, spawnProcess = spawn, identity = SOURCE_IDENTITY,
  background = process.argv.includes('--background'), automatic = process.argv.includes('--automatic'),
  replace = process.argv.includes('--replace'),
  sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  async function status() {
    let response;
    try { response = await fetcher(url + 'api/status', { signal: AbortSignal.timeout(600) }); }
    catch { return false; }
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (response.ok === false || data?.app !== app || data.identity?.installationPath !== identity.installationPath || data.identity?.buildId !== identity.buildId) {
      // --replace: ask an older copy of this same app to quit, then start this one.
      // Only this app's own control API is called; anything else on the port is left alone.
      if (replace && data?.app === app) {
        await fetcher(url + 'api/quit', { method: 'POST', signal: AbortSignal.timeout(2000),
          headers: { 'Content-Type': 'application/json', Origin: url.slice(0, -1) }, body: '{}' }).catch(() => {});
        for (let i = 0; i < 25; i++) {
          await sleep(200);
          try { await fetcher(url + 'api/status', { signal: AbortSignal.timeout(400) }); } catch { return false; }
        }
        throw new Error('The older copy at ' + url + ' did not quit. Open its control panel and choose Quit app.');
      }
      throw new Error('Another or older presence installation is running at ' + url + '. Open its control panel, choose Quit app, then launch this copy again. No running app was stopped.');
    }
    return true;
  }
  if (!(await status())) {
    const child = spawnProcess(process.execPath, [fileURLToPath(new URL('./server.js', import.meta.url))], { detached: true, windowsHide: true, stdio: 'ignore' });
    let spawnError;
    child.on('error', error => { spawnError = error; });
    child.unref();
    for (let i = 0; i < 30; i++) {
      if (spawnError) throw new Error('Could not start OpenAI Discord Presence: ' + spawnError.message);
      if (await status()) break;
      await sleep(200);
    }
  }
  if (!(await status())) throw new Error('Could not start OpenAI Discord Presence. Run node src/server.js for details.');
  // --automatic: switch the running app to Automatic, the same as clicking it.
  if (automatic) {
    const response = await fetcher(url + 'api/mode', { method: 'POST', signal: AbortSignal.timeout(2000),
      headers: { 'Content-Type': 'application/json', Origin: url.slice(0, -1) }, body: JSON.stringify({ mode: 'auto' }) });
    if (response.ok === false) throw new Error('The app started but did not switch to Automatic. Open its control panel and click Automatic.');
  }
  if (!background) spawnProcess('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, windowsHide: true, stdio: 'ignore' }).unref();
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await launch(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
