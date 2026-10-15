/* Discord Tower presentation. Existing presence controllers retain their own runtime controls. */
(() => {
  const main = document.querySelector('main');
  const previous = [...main.children];
  const header = document.querySelector('body > header');
  const mascot = header.querySelector('img');
  document.title = "Discord Tower — Discord Damsel · Astra's PetOS";
  header.querySelector('.eyebrow').textContent = "Astra's PetOS · Discord Damsel";
  header.querySelector('h1').textContent = 'Discord Tower';
  header.querySelector('h1 + p').textContent = 'Your Discord presence, plugins, themes, and recovery tools.';
  const el = (tag, text, parent, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    if (parent) parent.append(node);
    return node;
  };
  const key = 'discord-tower:interface:v2';
  let saved = {schema:2, tools:{}, backlog:[]};
  try { const value = JSON.parse(localStorage.getItem(key)); saved=DiscordTowerState.normalize(value); } catch {}
  let detectedBroken=false,lastCheckSuccessful=false,healthKnown=false;
  function publishHealth(){const broken=new Set(Object.entries(saved.tools).filter(([,v])=>v.sick).map(([id])=>id));if(detectedBroken)broken.add('betterdiscord-recovery');window.astraPetHealth={successful:lastCheckSuccessful,brokenTools:healthKnown||broken.size>0?broken.size:null,unansweredQuestions:null,notifications:null};document.dispatchEvent(new CustomEvent('astra-pet-health',{detail:window.astraPetHealth}));}
  publishHealth();
  const feedback = document.querySelector('#feedback');
  let backlogCount;
  const persist = () => { try {localStorage.setItem(key,JSON.stringify(saved)); refreshStatus(); publishHealth(); return true;} catch {feedback.textContent='Browser storage is unavailable. Export notes before closing.';return false;} };
  const link = (parent,text,url) => {const a=el('a',text,parent);a.href=url;a.target='_blank';a.rel='noopener';return a;};
  const stamp = (date = new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
  const status = el('div',undefined,main,'tower-status');
  el('span','Data: this browser',status);
  const last=el('span','Last entry: none',status);
  function refreshStatus(){const created=saved.backlog.at(-1)?.created;last.textContent='Last entry: '+(created&&!Number.isNaN(Date.parse(created))?stamp(created):'none');if(backlogCount)backlogCount.textContent='Weekly agent review: not connected. '+saved.backlog.length+' saved backlog entries. Export the backlog to retain a separate copy.';}
  refreshStatus();
  el('span','Updated: 2026-10-15 · v1.1',status);
  el('span','Seat: empty',status);
  link(status,'On the map ↗','https://findastra.github.io/astras-pet-os/system-map-20261012.html#node=findastra-discord-presence');
  const group = name => {const section=el('section',undefined,main,'tower-group');el('h2',name,section);return el('div',undefined,section,'tower-tools');};
  const thirdPartyGroup=group('Third Party Programs');thirdPartyGroup.classList.add('astra-program-row');
  for(const [name,icon,route] of [['Discord','discord','discord'],['BetterDiscord','betterdiscord','open-installer']]){
    const launch=el('button',undefined,thirdPartyGroup,'astra-cloud-launch');launch.type='button';
    const image=el('img',undefined,launch);image.src=icon+'-icon-20261015.png';image.alt='';
    el('span',name,launch);launch.setAttribute('aria-label',name==='Discord'?'Open Discord':'Open BetterDiscord installer');
    launch.onclick=()=>{action(route==='discord'?'open-discord':route);};
  }
  const programsGroup=group('Your Programs');programsGroup.parentElement.hidden=true;
  const toolsGroup=group('Your Tools');
  const shared=el('div',undefined,main,'tower-shared');
  const notesGroup=group('Your Notes');shared.append(notesGroup.parentElement);
  const tutorialGroup=group('Your Tutorials');shared.append(tutorialGroup.parentElement);tutorialGroup.classList.add('tower-tutorials');
  const split=el('div',undefined,shared,'astra-shared-split');split.append(tutorialGroup.parentElement,notesGroup.parentElement);
  const trainingGroup=group('Clicker Training');shared.append(trainingGroup.parentElement);
  const aboutGroup=group('About');shared.append(aboutGroup.parentElement);
  function card(parent,id,description) {
    const detail=el('details',undefined,parent,'tower-tool');detail.id=id;
    const labels={'openai-controls':'OpenAI controls','anthropic-controls':'Anthropic controls','presence-controls':'Your connected programs','presence-checklist':'Presence checklist','betterdiscord-recovery':'BetterDiscord recovery','plugins-and-themes':'Plugins & themes','notes-tool':'Notes & requests','play-with-findastra-discord-presence':'Play with Discord Damsel','care-for-findastra-discord-presence':'Care for Discord Damsel','clicker-training':'Click bindings','backlog-health':'Backlog & health','pet-collar':'Pet collar','links':'Links'};
    el('summary',labels[id]||id,detail);
    const content=el('div',undefined,detail,'tower-content');
    const controls=el('span',undefined,detail.querySelector('summary'),'tower-controls tower-light-controls');controls.setAttribute('role','group');controls.setAttribute('aria-label',(labels[id]||id)+' controls');
    const value=saved.tools[id] ||= {enabled:true,sick:false};
    const body=el('div',undefined,content,'tower-body');
    for(const field of ['enabled','sick']) {
      const light=el('button',undefined,controls,'tower-light');light.type='button';light.dataset.control=field;
      const updateLight=()=>{light.dataset.active=String(value[field]);const message=field==='enabled'?(value.enabled?'On — click to turn off':'Off — click to turn on'):(value.sick?'Needs maintenance — click to mark working':'Working — click to request maintenance');light.title=message;light.setAttribute('aria-label',(labels[id]||id)+': '+message);light.setAttribute('aria-pressed',String(value[field]));};
      updateLight();
      light.onclick=event=>{event.preventDefault();event.stopPropagation();value[field]=!value[field];if(field==='sick')saved.backlog.push({id:crypto.randomUUID(),created:new Date().toISOString(),kind:'bug',tool:id,text:value.sick?'Marked not working':'Cleared not working',status:'new'});persist();updateLight();gate();if(field==='enabled'&&id==='betterdiscord-recovery'){lastCheckSuccessful=false;healthKnown=false;publishHealth();if(value.enabled)refresh();}if(field==='enabled'&&!value.enabled&&id.startsWith('play-with-')&&chat.open)chat.close();if(field==='enabled'&&!value.enabled&&id.startsWith('care-for-')&&chat.open)chat.close();};
    }
    function gate(){body.setAttribute('aria-disabled',String(!value.enabled));for(const node of body.querySelectorAll('button,input,textarea,select'))node.disabled=!value.enabled;for(const a of body.querySelectorAll('a')){a.setAttribute('aria-disabled',String(!value.enabled));a.tabIndex=value.enabled?0:-1;}}
    body.addEventListener('click',event=>{if(!value.enabled){event.preventDefault();event.stopImmediatePropagation();}},true);
    el('p','discord-tower-v1.1-'+id+'-v1.0',body,'tower-version');
    el('p',description,body);
    el('p','ON controls actions in this page. Background apps have their own switches. Health reports stay in this browser; Farm reporting is not connected.',body,'tower-note');
    queueMicrotask(gate);
    return body;
  }
  const notes=card(notesGroup,'notes-tool','Keep a note or change request for Discord Tower.');
  const oldNotes=previous.find(n=>n.querySelector('h2')?.textContent==='Session notes');
  if(oldNotes) notes.append(oldNotes);
  const submit=el('button','Submit to backlog',notes);submit.type='button';
  submit.onclick=()=>{const text=oldNotes?.querySelector('textarea')?.value.trim();if(!text){feedback.textContent='Write a note first.';return;}saved.backlog.push({id:crypto.randomUUID(),created:new Date().toISOString(),author:'owner',kind:'note',tool:'notes-tool',text,status:'new',attachments:[]});if(persist()){last.textContent='Last entry: '+stamp();feedback.textContent='Saved to this browser’s backlog.';}};
  const exporter=header.querySelector('.toolbar button');if(exporter)notes.append(exporter);
  const exportBacklog=el('button','Export backlog',notes);exportBacklog.onclick=()=>{const blob=new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='discord-tower-backlog-'+stamp().replaceAll('-','')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const importLabel=el('label','Import saved backlog',notes);const importer=el('input',undefined,importLabel);importer.type='file';importer.accept='.json';
  importer.onchange=async()=>{const file=importer.files?.[0];if(!file)return;try{if(file.size>5_000_000)throw Error('Choose an export smaller than 5 MB.');const merged=DiscordTowerState.merge(saved,JSON.parse(await file.text()));localStorage.setItem(key,JSON.stringify(merged));location.reload();}catch(error){feedback.textContent='Import not applied: '+error.message;}finally{importer.value='';}};
  const controllers=previous.find(n=>n.querySelector('h2')?.textContent==='Existing local controllers');
  if(controllers){for(const a of [...controllers.querySelectorAll('a')]){
    const provider=a.textContent.toLowerCase().includes('openai')?'OpenAI':'Anthropic';
    const id=provider.toLowerCase()+'-controls';
    const body=card(toolsGroup,id,'Discord profile-card preview. Open the companion to change its presence settings.');
    a.className='tower-program-link';a.replaceChildren();
    const preview=el('span',undefined,a,'tower-discord-preview');
    const icon=el('img',undefined,preview);icon.src=provider.toLowerCase()+'-controls-icon-20261015.png';icon.alt=provider+' galaxy';
    const copy=el('span',undefined,preview);el('strong',provider,copy);el('span',provider==='OpenAI'?'Using OpenAI':'Using Claude',copy);el('span','Exploring ideas',copy,'preview-muted');el('span','Ready when you are',copy,'preview-muted');
    a.dataset.controller=provider.toLowerCase();a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.title='Start the local Discord Tower service to open these controls';a.setAttribute('aria-label','Open '+provider+' controls');body.append(a);
    el('p','Preview only — check Discord for the current live activity.',body,'tower-note');
  }controllers.remove();}
  const checklist=card(toolsGroup,'presence-checklist','Check the visible Discord result after changing a presence app.');
  const oldChecklist=previous.find(n=>n.querySelector('h2')?.textContent==='Presence checklist');if(oldChecklist)checklist.append(oldChecklist);
  const recovery=card(toolsGroup,'betterdiscord-recovery','Recover the official BetterDiscord installer, then install or repair BetterDiscord.');
  const live=el('p','Connecting to this PC’s recovery checker…',recovery);live.setAttribute('role','status');
  const actions=el('div',undefined,recovery,'tower-links');
  async function action(route){const owner=route==='open-manager'?'plugins-and-themes':route==='open-discord'?null:'betterdiscord-recovery';if(owner&&saved.tools[owner]?.enabled===false){live.textContent='This tool is OFF. Use its top light to enable it.';recovery.closest('details').open=true;live.scrollIntoView({block:'center'});return;}try{const response=await fetch('/api/'+route,{method:'POST',headers:{'X-Discord-Tower':'local-action'}});const result=await response.json();if(!response.ok)throw Error(result.error);live.textContent='Action accepted. Checking the result…';setTimeout(refresh,1500);}catch(error){live.textContent=error.message;recovery.closest('details').open=true;live.scrollIntoView({block:'center'});}}
  for(const [label,route] of [['Check now','check'],['Download fresh installer','download'],['Open verified installer','open-installer'],['Open extension manager','open-manager']]){const b=el('button',label,actions);b.onclick=()=>action(route);}
  async function refresh(){if(saved.tools['betterdiscord-recovery']?.enabled===false)return;try{const response=await fetch('/api/status',{cache:'no-store'});if(!response.ok)throw Error('Local recovery service is unavailable');const state=await response.json();if(saved.tools['betterdiscord-recovery']?.enabled===false)return;if(!Array.isArray(state.channels)||!Array.isArray(state.extensions))throw Error('Invalid service response');healthKnown=true;for(const a of toolsGroup.querySelectorAll('[data-controller]')){const candidate=state.programs?.[a.dataset.controller];if(typeof candidate==='string'){const url=new URL(candidate);if(url.protocol==='http:'&&url.hostname===location.hostname&&!url.username&&!url.password){a.href=url.href;a.setAttribute('aria-disabled',String(saved.tools[a.dataset.controller+'-controls']?.enabled===false));a.title='Open '+a.dataset.controller+' controls';}}}detectedBroken=state.channels.some(c=>c.needs_repair);lastCheckSuccessful=state.channels.length>0&&!detectedBroken&&!state.error;publishHealth();live.textContent=state.channels.map(c=>c.channel+' '+c.version+': '+(c.needs_repair?'repair needed':'loader files present')).join(' · ')+' — Installer '+(state.installer_ready?'verified and ready':'missing')+'. Startup monitor '+(state.monitor?'enabled':'off')+'.'+(state.error?' '+state.error:'');extensionStatus.textContent=state.extensions.length?state.extensions.map(x=>x.kind+': '+x.name).join(' · '):'No installed plugins or themes found on this PC.';}catch(error){lastCheckSuccessful=false;healthKnown=false;publishHealth();live.textContent='Local recovery service unavailable. Open the recovery utility to check this PC.';}}
  setInterval(refresh,15000);setTimeout(refresh,0);
  el('p','Open betterdiscord-recovery-20261015.lnk from your downloaded output folder for the local recovery and extension controls. BetterDiscord’s installer is third-party software and uses its own interface.',recovery,'tower-note');
  const thirdParty=el('div',undefined,recovery,'tower-links');
  link(thirdParty,'Official BetterDiscord download ↗','https://betterdiscord.app/');
  link(thirdParty,'Installer releases ↗','https://github.com/BetterDiscord/Installer/releases');
  el('p','Third-party · downloaded to this PC · public source',recovery,'tower-version');
  const extensions=card(toolsGroup,'plugins-and-themes','Manage existing .plugin.js and .theme.css files through the local utility.');
  const extensionStatus=el('p','Checking installed extensions…',extensions);
  el('p','Use Import, Park, and Restore in the local utility. The inventory above is read from this PC while the local recovery service is running. A parked extension is backed up before being removed from the active folder.',extensions);
  const chat=document.createElement('dialog');chat.id='tower-chat';chat.setAttribute('aria-labelledby','tower-chat-title');document.body.append(chat);
  const close=el('button','×',chat,'tower-close');close.setAttribute('aria-label','Close Discord Damsel chat');close.onclick=()=>chat.close();
  const title=el('h2',"Astra’s Cyber Deck — Discord Damsel Chat",chat);title.id='tower-chat-title';
  const chatStatus=el('p','Seat: empty. No AI account is connected to this page.',chat);
  el('p','Your subscriptions and messages have not been accessed. Connecting a compatible host is still needed before chat or guided tutorials can run.',chat);
  const openChat=(topic)=>{chatStatus.textContent=topic?topic+' — L3 is disconnected. This tutorial has not started.':'Seat: empty. No AI account is connected to this page.';chat.showModal();};
  for(const [id,label] of [['play-with-findastra-discord-presence','Play with Discord Damsel'],['care-for-findastra-discord-presence','Care for Discord Damsel']]){const body=card(tutorialGroup,id,label+' — guided tutorial connection pending.');const b=el('button','Open in Damsel chat',body);b.onclick=()=>openChat(label);}
  trainingGroup.classList.add('astra-clicker-training');
  const bindings=el('dl',undefined,trainingGroup);
  for(const [gesture,action] of [['One click','Show the most important emotion-linked message.'],['Two clicks','Show or hide Discord Tower. Background recovery keeps running.'],['Three clicks','Run the assigned quick tool. No quick tool is assigned by this page.']]){el('dt',gesture,bindings);el('dd',action,bindings);}
  el('p','Desktop binding status: not verified by this page. The yellow phone opens Damsel chat.',trainingGroup);
  const backlog=card(aboutGroup,'backlog-health','Notes and health reports stay on this device.');backlogCount=el('p','',backlog);refreshStatus();
  const passport=card(aboutGroup,'pet-collar','Discord Damsel · Discord Tower · by Astra.');el('p','Interface v1.1 · 2026-10-15. Existing Damsel artwork preserved. Release signature and central permission enforcement are not verified by this page.',passport);
  const links=card(aboutGroup,'links','Source, documentation, and third-party software.');
  link(links,'Source · Astra · public ↗','https://github.com/findastra/findastra-discord-presence');el('br',undefined,links);
  link(links,'Pet Program Framework · docs ↗','https://github.com/findastra/astras-pet-os/blob/main/PET-PROGRAM-FRAMEWORK.md');
  // Every original card is preserved even if the legacy page acquires another feature.
  for(const old of previous)if(old.parentElement===main)card(toolsGroup,'additional-controls', 'Existing program controls.').append(old);
  const launcher=el('button',undefined,document.body);launcher.id='tower-chat-launcher';launcher.setAttribute('aria-label','Open Discord Damsel chat');launcher.setAttribute('aria-controls','tower-chat');launcher.onclick=()=>openChat();
  const portrait=el('img',undefined,launcher);portrait.src=mascot.src;portrait.alt='';
  for(const footer of document.querySelectorAll('body > footer'))footer.remove();
  const footer=el('footer',undefined,shared,'tower-footer');el('p','HTML · CSS · JavaScript · MIT · Local notes stay in this browser.',footer);
  const signature=el('astra-footer',undefined,footer);signature.setAttribute('date','2026-10-15');status.slot='status';signature.append(status);
})();
