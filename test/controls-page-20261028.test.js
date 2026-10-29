// Each app's controls page as Astra laid it out (2026-10-28): no slogan, no pause button,
// a chat topic switch, an update line fed by the app's version, and the instructions link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (app, file) => readFileSync(join(root, app, file), 'utf8').replace(/\r\n/g, '\n');

for (const app of ['openai-discord-presence', 'anthropic-discord-presence']) {
  test(`${app}: the controls page's layout`, () => {
    const html = read(app, 'public/index.html');
    assert.doesNotMatch(html, /hero-bottom|Your presence, (among the stars|in bloom)/);
    const buttons = html.match(/<div class="buttons">([\s\S]*?)<\/div>/)[1];
    assert.deepEqual([...buttons.matchAll(/id="(\w+)"/g)].map((m) => m[1]), ['manual', 'off', 'auto', 'topic', 'quit']);
    assert.match(html, /<p id="update" class="note" role="status"><\/p>/);
    assert.match(html, /href="https:\/\/github\.com\/findastra\/ai-discord-presence\/blob\/main\/ADDING-A-MODEL\.md"[^>]*>AI Discord Presence instructions<\/a>/);
  });

  test(`${app}: the page learns its version from the app and asks GitHub only for the version number`, () => {
    assert.match(read(app, 'src/server.js'), /version: VERSION,/);
    const js = read(app, 'public/app.js');
    const urls = [...js.matchAll(/https:\/\/[^'"`\s]+/g)].map((m) => m[0]);
    assert.ok(urls.includes(`https://raw.githubusercontent.com/findastra/ai-discord-presence/main/${app}/package.json`));
    assert.match(js, /\$\('topic'\)\.textContent = state\.config\.shareProject \? 'Hide chat topic' : 'Show chat topic'/);
  });
}
