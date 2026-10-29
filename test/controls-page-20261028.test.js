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
    // One link, to the instructions on GitHub (Astra, 2026-10-28).
    assert.match(html, /<p id="intro">Discord presence card showing AI make &amp; model, what it’s working on \(chat title\), and for how long\./);
    assert.match(html, /See <a href="https:\/\/github\.com\/findastra\/ai-discord-presence\/blob\/main\/ADDING-A-MODEL\.md"[^>]*>AI Discord Presence on GitHub ↗<\/a>\./);
  });

  // Trimmed as Astra asked (2026-10-28): GitHub only in the paragraph, the heading on its own row, a card like
  // Discord's ("Playing", three dots) with nothing under it, no settings section, no PREVIEW label, short button
  // names, and only the chosen mode lit.
  test(`${app}: the trimmed controls page`, () => {
    const html = read(app, 'public/index.html');
    // No GitHub link in the header, so it has room for the whole name.
    assert.doesNotMatch(html, /<nav>/);
    assert.doesNotMatch(html, /id="(setup|settings|update|status|badge|mode-note|rotation|preview-label)"/);
    assert.match(html, /<h2 class="headline">[^<]*<br>[^<]*<\/h2>\n<div class="session"><p id="intro">/);
    assert.match(html, /<div class="preview-top"><span>Playing<\/span><span class="dots" aria-hidden="true">•••<\/span><\/div>/);
    assert.match(html, /<\/p><\/div><\/div><\/div>\n<\/aside>/);
    const buttons = html.match(/<div class="buttons">([\s\S]*?)<\/div>/)[1];
    assert.deepEqual([...buttons.matchAll(/>([^<]+)<\/button>/g)].map((m) => m[1]), ['Start', 'Stop', 'Automatic', 'Show Chat Topic', 'Quit']);
    assert.doesNotMatch(buttons, /class="primary"/);
    assert.match(read(app, 'public/style.css'), /\.buttons\{display:flex;flex-wrap:nowrap/);
    const js = read(app, 'public/app.js');
    assert.match(js, /for \(const mode of \['manual', 'off', 'auto'\]\) \$\(mode\)\.setAttribute\('aria-pressed', String\(state\.mode === mode\)\)/);
    assert.match(js, /\$\('topic'\)\.textContent = state\.config\.shareProject \? 'Hide Chat Topic' : 'Show Chat Topic'/);
  });

  test(`${app}: the page learns its state from the app`, () => {
    assert.match(read(app, 'src/server.js'), /version: VERSION,/);
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
