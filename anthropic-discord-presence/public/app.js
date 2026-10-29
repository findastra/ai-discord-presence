const $ = id => document.getElementById(id);
const hosted = document.body.hasAttribute('data-hosted') || location.protocol === 'file:';
let state;
let ended = false;
$('topic').addEventListener('click', async () => {
  if (hosted) {
    const on = $('topic').getAttribute('aria-pressed') !== 'true';
    $('topic').setAttribute('aria-pressed', String(on));
    $('topic').textContent = on ? 'Hide Chat Topic' : 'Show Chat Topic';
    $('project-preview').textContent = on ? 'Working on Astra’s Infinite Pole' : 'Exploring ideas';
    return;
  }
  if (!state) return;
  $('topic').disabled = true;
  try { await request('/api/config', { ...state.config, shareProject: !state.config.shareProject }); await refresh(); }
  catch {}
  finally { $('topic').disabled = false; }
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
  $('timer').parentElement.classList.remove('running');
  if (ended) { $('timer').textContent = 'App closed. You can close this tab.'; return; }
  if (!state?.startedAt) { $('timer').textContent = 'Ready when you are'; return; }
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - state.startedAt);
  // Discord writes elapsed time as 0:17, 12:05 or 1:02:09, in green beside a controller.
  const h = Math.floor(elapsed / 3600), m = Math.floor(elapsed / 60) % 60, sec = String(elapsed % 60).padStart(2, '0');
  $('timer').textContent = h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  $('timer').parentElement.classList.add('running');
}

async function refresh() {
  if (ended || hosted) return;
  try {
    state = await request('/api/status');
    $('project-preview').textContent = state.project ? `Working on ${state.project}` : 'Exploring ideas';
    $('model-preview').textContent = `Using ${state.modelLabel}${state.effortLabel ? ` on ${state.effortLabel}` : ''}`;
    $('topic').textContent = state.config.shareProject ? 'Hide Chat Topic' : 'Show Chat Topic';
    $('topic').setAttribute('aria-pressed', String(state.config.shareProject === true));
    // Start, Stop and Automatic are one choice: only the current mode is lit.
    for (const mode of ['manual', 'off', 'auto']) $(mode).setAttribute('aria-pressed', String(state.mode === mode));
    drawTimer();
  } catch {
    state = null;
    drawTimer();
  }
}

for (const mode of ['manual', 'off', 'auto']) {
  $(mode).addEventListener('click', async () => {
    if (hosted) {
      for (const other of ['manual', 'off']) $(other).setAttribute('aria-pressed', String(other === mode));
      state = { startedAt: mode === 'manual' ? (state?.startedAt || Math.floor(Date.now() / 1000)) : null };
      drawTimer();
      return;
    }
    $(mode).disabled = true;
    try { await request('/api/mode', { mode }); await refresh(); }
    catch {}
    finally { $(mode).disabled = false; }
  });
}
$('quit').addEventListener('click', async () => {
  try {
    await request('/api/quit', {});
    ended = true;
    state = null;
    drawTimer();
    document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  } catch {}
});
if (hosted) {
  document.body.classList.add('hosted');
  $('download').hidden = false;
  $('quit').hidden = true;
  $('model-preview').textContent = 'Using Claude Opus 5.5 on Max';
  $('project-preview').textContent = 'Working on Astra’s Infinite Pole';
  $('topic').textContent = 'Hide Chat Topic';
  $('topic').setAttribute('aria-pressed', 'true');
  $('manual').setAttribute('aria-pressed', 'true');
  $('off').setAttribute('aria-pressed', 'false');
  state = { startedAt: Math.floor(Date.now() / 1000) - 42 * 60 };
  drawTimer();
  if (location.protocol === 'file:') {
    $('download').querySelector('a').href = 'https://github.com/findastra/ai-discord-presence/raw/main/downloads/anthropic-discord-presence.zip';
  }
} else void refresh();
setInterval(refresh, 2000);
setInterval(drawTimer, 1000);
