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
    if (app !== 'openai-discord-presence') assert.match(html, /<p id="update" class="note" role="status"><\/p>/);
    assert.match(html, /href="https:\/\/github\.com\/findastra\/ai-discord-presence\/blob\/main\/ADDING-A-MODEL\.md"[^>]*>AI Discord Presence instructions<\/a>/);
  });
}

// OpenAI's page trimmed as Astra asked (2026-10-28): GitHub links to its own repo, nothing under the card, no
// settings section, no PREVIEW label, short button names on one row, and only the chosen mode lit.
test('openai-discord-presence: the trimmed controls page', () => {
  const html = read('openai-discord-presence', 'public/index.html');
  assert.match(html, /<nav><a href="https:\/\/github\.com\/findastra\/openai-discord-presence"/);
  assert.doesNotMatch(html, /id="(setup|settings|update|status|badge|mode-note|rotation|preview-label)"/);
  assert.match(html, /<\/p><\/div><\/div>\n<\/aside>/);
  const buttons = html.match(/<div class="buttons">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...buttons.matchAll(/>([^<]+)<\/button>/g)].map((m) => m[1]), ['Start', 'Stop', 'Automatic', 'Show chat topic', 'Quit']);
  assert.doesNotMatch(buttons, /class="primary"/);
  const css = read('openai-discord-presence', 'public/style.css');
  assert.match(css, /\.buttons\{display:flex;flex-wrap:nowrap/);
  const js = read('openai-discord-presence', 'public/app.js');
  assert.match(js, /for \(const mode of \['manual', 'off', 'auto'\]\) \$\(mode\)\.setAttribute\('aria-pressed', String\(state\.mode === mode\)\)/);
  assert.match(js, /\$\('topic'\)\.textContent = state\.config\.shareProject \? 'Hide chat topic' : 'Show chat topic'/);
});

for (const app of ['anthropic-discord-presence']) {
  test(`${app}: the page learns its version from the app and asks GitHub only for the version number`, () => {
    assert.match(read(app, 'src/server.js'), /version: VERSION,/);
    const js = read(app, 'public/app.js');
    const urls = [...js.matchAll(/https:\/\/[^'"`\s]+/g)].map((m) => m[0]);
    assert.ok(urls.includes(`https://raw.githubusercontent.com/findastra/ai-discord-presence/main/${app}/package.json`));
    assert.match(js, /\$\('topic'\)\.textContent = state\.config\.shareProject \? 'Hide chat topic' : 'Show chat topic'/);
  });
}

for (const app of ['openai-discord-presence', 'anthropic-discord-presence']) {
  test(`${app}: the page may load only the footer star and the version number from outside this PC`, () => {
    const csp = read(app, 'src/server.js').match(/'Content-Security-Policy': "([^"]+)"/)[1];
    assert.match(csp, /img-src 'self' https:\/\/findastra\.github\.io;/);
    assert.match(csp, /connect-src 'self' https:\/\/raw\.githubusercontent\.com;/);
    assert.match(csp, /script-src 'self';/);
  });
}
