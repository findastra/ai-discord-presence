import { execFile } from 'node:child_process';

// The website card (Astra, 2026-10-29): the same card Discord shows, copied to one file in a public GitHub gist, so
// findastra.github.io can show it live. Off unless config.webCardGist names a gist, so friends' copies never publish.
// It only ever writes what Discord already shows: the card's title, its two lines and when it started.

// At most one gist write per 30 seconds, however often the card changes.
export const WEB_CARD_MS = 30_000;
// While a card shows, it is written again every 5 minutes, so the page can tell a live card from one left behind
// when the PC went to sleep.
export const WEB_CARD_HEARTBEAT_MS = 5 * 60_000;

export function webCard(payload, now = Date.now()) {
  if (!payload) return { active: false, updatedAt: now };
  return { active: true, name: payload.name, details: payload.details, state: payload.state,
    startedAt: payload.timestamps?.start ?? null, updatedAt: now };
}

export function validGist(value) {
  const gist = String(value ?? '').trim().toLowerCase();
  return /^[0-9a-f]{20,40}$/.test(gist) ? gist : '';
}

// The token comes from the GitHub CLI's own sign-in each time the app starts; it is kept in memory only.
const ghToken = () => new Promise((resolve, reject) => {
  execFile('gh', ['auth', 'token'], { windowsHide: true, timeout: 10_000 }, (error, out) => {
    if (error || !String(out).trim()) reject(new Error('Website card: sign in to the GitHub CLI (gh auth login).'));
    else resolve(String(out).trim());
  });
});

export class WebCard {
  error = '';
  #sentAt = -Infinity;
  #last;
  #busy = false;
  #token;
  constructor(file, { fetchImpl = fetch, token = ghToken } = {}) {
    this.file = file;
    this.fetch = fetchImpl;
    this.getToken = token;
  }
  // payload is the Discord activity, or null when no card shows. force skips the wait (used when the app quits).
  async push(gist, payload, now = Date.now(), force = false) {
    gist = validGist(gist);
    if (!gist || this.#busy) return false;
    const card = webCard(payload, now);
    const signature = JSON.stringify({ ...card, updatedAt: 0 });
    const due = force || (signature !== this.#last ? now - this.#sentAt >= WEB_CARD_MS : card.active && now - this.#sentAt >= WEB_CARD_HEARTBEAT_MS);
    if (!due) return false;
    this.#busy = true;
    try {
      this.#token ??= await this.getToken();
      const res = await this.fetch('https://api.github.com/gists/' + gist, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + this.#token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'ai-discord-presence' },
        body: JSON.stringify({ files: { [this.file]: { content: JSON.stringify(card, null, 2) + '\n' } } }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 401) this.#token = undefined;
      if (!res.ok) throw new Error('Website card: GitHub answered ' + res.status + '.');
      this.#last = signature;
      this.error = '';
      return true;
    } catch (error) {
      this.error = error.message;
      return false;
    } finally {
      // A failed write waits the same 30 seconds before trying again.
      this.#sentAt = now;
      this.#busy = false;
    }
  }
}
