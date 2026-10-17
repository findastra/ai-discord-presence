export const IDLE_MS = 5 * 60 * 1000;

export class Presence {
  mode = 'off';
  startedAt = null;
  setMode(mode) {
    if (!['off', 'auto', 'manual'].includes(mode)) throw new Error('Choose Off, Automatic, or Manual.');
    if (mode !== this.mode) this.startedAt = null;
    this.mode = mode;
  }
  update(detected, now = Date.now()) {
    const active = this.mode === 'manual' || (this.mode === 'auto' && detected);
    if (!active) this.startedAt = null;
    else this.startedAt ??= Math.floor(now / 1000);
    return this.startedAt;
  }
}

export function projectLabel(value) {
  return String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110);
}

// Folder slugs this owner used before naming the project. They are only a fallback: a session name set
// with /rename in Claude Code always wins, because it is shown exactly as written.
export function projectDisplayName(value) {
  const label = projectLabel(value);
  return /^(?:findastra[ -]pet[ -]apps|astras[ -]pet[ -](?:apps|os))$/i.test(label) ? "Astra's PetOS" : label;
}

// Discord takes about five activity updates per 20 seconds from one app. A new project every 6 seconds
// stays inside that with room to spare, so every active project gets its turn quickly.
export const ROTATE_MS = 6000;

// The cards to rotate through, newest first: one per project and model, so five chats in the same
// project with the same model take one turn, not five, while two models in one project still each show.
// Chats with no project name only count when nothing else has a name, so "Exploring ideas" never
// takes a turn away from a real project.
export function rotationCards(sessions = []) {
  const seen = new Map();
  for (const session of sessions) {
    const card = { project: projectLabel(session?.project), model: session?.model || '', effort: session?.effort || '' };
    const key = JSON.stringify(card);
    if (!seen.has(key)) seen.set(key, card);
  }
  const named = [...seen.values()].filter(card => card.project);
  return named.length ? named : [...seen.values()].slice(0, 1);
}

// Keep model and effort attached to their own session while projects rotate. A private or fixed
// project label uses the newest session; neither setting exposes another session's folder.
export function selectSession(detection = {}, config = {}, now = Date.now()) {
  const sessions = detection.sessions?.length ? detection.sessions : [detection];
  const override = projectLabel(config.projectName);
  const rotate = config.shareProject === true && !override;
  const choices = rotate ? rotationCards(sessions) : sessions;
  const selected = choices[rotate ? Math.floor(now / ROTATE_MS) % choices.length : 0];
  return {
    project: config.shareProject === true ? override || projectLabel(selected.project) : '',
    model: selected.model || '',
    effort: selected.effort || '',
  };
}

const cap = word => word.charAt(0).toUpperCase() + word.slice(1);

// Friendly name for an exact model id: 'claude-opus-5-5' → 'Claude Opus 5.5', 'claude-haiku-4-5-20251001' → 'Claude Haiku 4.5'.
// Unrecognized ids are shown exactly as written. Empty means the model is unknown.
export function modelLabel(id) {
  const model = projectLabel(id).slice(0, 64);
  const named = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/i.exec(model);
  if (named) return `Claude ${cap(named[1])} ${named[2]}${named[3] ? '.' + named[3] : ''}${named[4] ? ' (1M)' : ''}`;
  const legacy = /^claude-(\d+)(?:-(\d))?-([a-z]+)(?:-\d{8})?$/i.exec(model);
  if (legacy) return `Claude ${legacy[1]}${legacy[2] ? '.' + legacy[2] : ''} ${cap(legacy[3])}`;
  return model;
}

const EFFORTS = { minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra High', max: 'Max', ultra: 'Ultra' };

// Friendly name for an effort level: 'high' → 'High', 'xhigh' → 'Extra High'. Unknown levels are capitalized; empty means unknown.
export function effortLabel(id) {
  const effort = String(id ?? '').trim().toLowerCase();
  if (!/^[a-z-]{1,20}$/.test(effort)) return '';
  return EFFORTS[effort] ?? cap(effort);
}

// Card art: loaded by Discord straight from the public repo, so nobody has to upload it in the Developer Portal.
// Bump ?v= whenever the card art changes so Discord fetches the new image instead of a cached one.
// The project's own Discord application. Application IDs are public, so friends can use it without any setup.
export const BUILT_IN_CLIENT_ID = '1555096326734094356';

export const GALAXY_URL = 'https://raw.githubusercontent.com/findastra/findastra-discord-presence/main/anthropic-discord-presence/public/galaxy-card.gif?v=7';

export function activity(startedAt, image = GALAXY_URL, project = '', model = '', effort = '') {
  if (startedAt === null) return null;
  const name = modelLabel(model) || 'Claude';
  // The effort level only means something next to a known model.
  const level = modelLabel(model) ? effortLabel(effort) : '';
  return {
    type: 0,
    // Card title. Discord shows this instead of the registered app name, which can't be a brand name.
    name: 'Anthropic',
    details: level ? `Using ${name} on ${level}` : `Using ${name}`,
    state: projectLabel(project) ? `Working on ${projectLabel(project)}` : 'Exploring ideas',
    timestamps: { start: startedAt },
    assets: { large_image: image, large_text: projectLabel(model).slice(0, 64) || name },
  };
}

export function validateConfig(input) {
  const clientId = String(input.clientId ?? '').trim();
  const image = String(input.image || GALAXY_URL).trim();
  if (!/^\d{17,20}$/.test(clientId)) throw new Error('Paste the 17–20 digit Discord Application ID. No token needed.');
  // Either an uploaded Discord asset key or an https image link.
  if (!/^[a-z0-9_-]{1,128}$/.test(image) && !/^https:\/\/[^\s"<>]{1,240}$/.test(image)) throw new Error('Use an uploaded asset key or an https image link.');
  return { clientId, image, shareProject: input.shareProject === true, projectName: projectLabel(input.projectName),
    automaticOnStart: input.automaticOnStart === true, alwaysOn: input.alwaysOn === true };
}

// The mode a launch starts in. Always on shares straight away, because Claude on the web, desktop chat and
// cloud sessions leave nothing on this computer to detect. Otherwise Windows startup starts in Automatic.
export function launchMode(config = {}) {
  return config.alwaysOn === true ? 'manual' : config.automaticOnStart === true ? 'auto' : 'off';
}

// Turning Always on starts sharing now. Turning it off keeps the current session until Stop sharing.
export function modeAfterSettings(previous = {}, next = {}, mode = 'off') {
  return next.alwaysOn === true && previous.alwaysOn !== true ? 'manual' : mode;
}
