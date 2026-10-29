const $ = id => document.getElementById(id);
const hosted = document.body.hasAttribute('data-hosted') || location.protocol === 'file:';
let state;
let initialized = false;
let ended = false;
let updateChecked = false;
// Is a newer version out? The page asks GitHub for the version number in this app's package.json on main, once.
async function checkUpdate(current) {
  const line = $('update');
  try {
    const response = await fetch('https://raw.githubusercontent.com/findastra/ai-discord-presence/main/openai-discord-presence/package.json', { cache: 'no-store' });
    const latest = (await response.json()).version;
    const newer = String(latest).split('.').map(Number).some((n, i, all) => { const c = String(current).split('.').map(Number); return all.slice(0, i).every((m, j) => m === c[j]) && n > (c[i] ?? 0); });
    line.textContent = '';
    if (newer) {
      line.append(`Update available: version ${latest} (you have ${current}). `);
      const link = document.createElement('a');
      link.href = 'https://github.com/findastra/ai-discord-presence#start-it-about-2-minutes'; link.target = '_blank'; link.rel = 'noreferrer';
      link.textContent = 'How to update';
      line.append(link);
    } else line.textContent = `Version ${current}: up to date.`;
  } catch { line.textContent = `Version ${current}. Could not check for updates.`; }
}
$('topic').addEventListener('click', async () => {
  if (hosted) {
    const on = $('topic').getAttribute('aria-pressed') !== 'true';
    $('topic').setAttribute('aria-pressed', String(on));
    $('topic').textContent = on ? 'Hide chat topic' : 'Show chat topic';
    $('project-preview').textContent = on ? 'Working on Astra’s Infinite Pole' : 'Exploring ideas';
    return;
  }
  if (!state) return;
  $('topic').disabled = true;
  try { await request('/api/config', { ...state.config, shareProject: !state.config.shareProject }); await refresh(); }
  catch (error) { $('status').textContent = error.message; }
  finally { $('topic').disabled = false; }
});
const motionButton = $('motion');
motionButton.addEventListener('click', () => {
  const paused = document.querySelector('.galaxy').classList.toggle('paused');
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Play galaxy' : 'Pause galaxy';
});

async function request(path, body) {
  const response = await fetch(path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not update the app.');
  return data;
}

function drawTimer() {
  if (!state?.startedAt) { $('timer').textContent = 'Ready when you are'; return; }
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - state.startedAt);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor(elapsed / 60) % 60).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  $('timer').textContent = `${h}:${m}:${s} elapsed`;
}

async function refresh() {
  if (ended || hosted) return;
  try {
    state = await request('/api/status');
    if (!initialized) {
      $('clientId').value = state.config.clientId;
      $('image').value = state.config.image;
      $('share-project').checked = state.config.shareProject;
      $('project-name').value = state.config.projectName || '';
      $('automatic-start').checked = state.startupEnabled;
      $('setup').open = !state.config.clientId;
      initialized = true;
    }
    $('status').textContent = state.message;
    $('project-preview').textContent = state.project ? `Working on ${state.project}` : 'Exploring ideas';
    const turns = state.projects?.length > 1 ? `Taking turns every ${state.rotateSeconds} seconds: ${state.projects.join(' · ')}` : '';
    $('rotation').textContent = turns;
    $('rotation').hidden = !turns;
    $('model-preview').textContent = `Using ${state.modelLabel}${state.effortLabel ? ` on ${state.effortLabel}` : ''}`;
    $('topic').textContent = state.config.shareProject ? 'Hide chat topic' : 'Show chat topic';
    $('topic').setAttribute('aria-pressed', String(state.config.shareProject === true));
    $('share-project').checked = state.config.shareProject;
    if (!updateChecked) { updateChecked = true; void checkUpdate(state.version); }
    $('dot').className = state.published ? 'live' : '';
    $('badge').textContent = state.published ? 'SHARING' : state.mode === 'off' ? 'OFF' : 'WAITING';
    $('auto').setAttribute('aria-pressed', String(state.mode === 'auto'));
    $('manual').textContent = state.mode === 'manual' ? 'Session started' : 'Start session';
    $('mode-note').textContent = state.mode === 'auto'
      ? 'Automatic uses the latest Codex task and names its exact model. Hides after 5 minutes without activity; it does not track window focus.'
      : 'Manual sessions stay on until you stop them or quit this app.';
    drawTimer();
  } catch {
    $('status').textContent = 'The local companion is offline. Open Start OpenAI Discord Presence again.';
    $('dot').className = '';
    $('badge').textContent = 'OFFLINE';
    state = null;
    drawTimer();
  }
}

for (const mode of ['manual', 'off', 'auto']) {
  $(mode).addEventListener('click', async () => {
    if (hosted) {
      state = { startedAt: mode === 'manual' ? (state?.startedAt || Math.floor(Date.now() / 1000)) : null };
      drawTimer();
      return;
    }
    if (mode !== 'off' && !state?.config.clientId) {
      $('setup').open = true;
      $('clientId').focus();
      $('status').textContent = 'Save a valid application ID in Settings, then start your session.';
      return;
    }
    $(mode).disabled = true;
    try { await request('/api/mode', { mode }); await refresh(); }
    catch (error) { $('status').textContent = error.message; }
    finally { $(mode).disabled = false; }
  });
}
$('settings').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await request('/api/config', { clientId: $('clientId').value, image: $('image').value,
      shareProject: $('share-project').checked, projectName: $('project-name').value,
      automaticOnStart: state.config.automaticOnStart });
    $('save-status').textContent = 'Saved. Choose Start session or Automatic.';
    await refresh();
  } catch (error) { $('save-status').textContent = error.message; }
});
$('quit').addEventListener('click', async () => {
  try {
    await request('/api/quit', {});
    ended = true;
    state = null;
    $('status').textContent = 'App closed. Sharing has stopped. You can close this tab.';
    $('badge').textContent = 'OFF';
    $('dot').className = '';
    drawTimer();
    document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  } catch (error) { $('status').textContent = error.message; }
});
$('automatic-start').addEventListener('change', async () => {
  try {
    await request('/api/startup', { enabled: $('automatic-start').checked });
    await refresh();
    $('save-status').textContent = $('automatic-start').checked ? 'Will run quietly when you sign into Windows.' : 'Windows startup disabled.';
  } catch (error) {
    $('automatic-start').checked = ! $('automatic-start').checked;
    $('save-status').textContent = error.message;
  }
});
if (hosted) {
  document.body.classList.add('hosted');
  $('download').hidden = false;
  $('settings').hidden = true;
  $('quit').hidden = true;
  $('badge').textContent = 'FREE COMPANION';
  $('manual').textContent = 'Preview timer';
  $('off').textContent = 'Reset preview';
  $('mode-note').textContent = 'Try the timer here. Download the companion to share it on Discord.';
  $('status').textContent = 'Discord presence needs the companion running on your Windows computer.';
  $('model-preview').textContent = 'Using GPT-6 Astra on Ultra';
  $('project-preview').textContent = 'Working on Astra’s Infinite Pole';
  $('topic').textContent = 'Hide chat topic';
  $('topic').setAttribute('aria-pressed', 'true');
  state = { startedAt: Math.floor(Date.now() / 1000) - 42 * 60 };
  drawTimer();
  if (location.protocol === 'file:') {
    $('download').querySelector('a').href = 'https://github.com/findastra/ai-discord-presence/raw/main/downloads/openai-discord-presence.zip';
  }
} else void refresh();
setInterval(refresh, 2000);
setInterval(drawTimer, 1000);
