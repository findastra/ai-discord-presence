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
  try { const value = JSON.parse(localStorage.getItem(key)); if(value?.schema === 2 && value.tools && Array.isArray(value.backlog)) saved=value; } catch {}
  const feedback = document.querySelector('#feedback');
  let backlogCount;
  const persist = () => { try {localStorage.setItem(key,JSON.stringify(saved)); refreshStatus(); return true;} catch {feedback.textContent='Browser storage is unavailable. Export notes before closing.';return false;} };
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
  const notesGroup=group('Your notes');
  const toolsGroup=group('Tools');
  const tutorialGroup=group('Tutorials');
  const aboutGroup=group('About this program');
  function card(parent,id,description) {
    const detail=el('details',undefined,parent,'tower-tool');detail.id=id;
    el('summary',id,detail);
    const content=el('div',undefined,detail,'tower-content');
    const controls=el('div',undefined,content,'tower-controls');
    const value=saved.tools[id] ||= {enabled:true,sick:false};
    const body=el('div',undefined,content,'tower-body');
    for(const [field,label] of [['enabled','ON'],['sick','Not working']]) {
      const wrap=el('label',undefined,controls),input=el('input',undefined,wrap);input.type='checkbox';input.checked=value[field];input.setAttribute('aria-label',id+' '+label);el('span',label,wrap);
      input.onchange=()=>{value[field]=input.checked;if(field==='sick')saved.backlog.push({id:crypto.randomUUID(),created:new Date().toISOString(),kind:'bug',tool:id,text:input.checked?'Marked not working':'Cleared not working',status:'new'});persist();gate();};
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
  const presence=card(toolsGroup,'presence-controls','Open the existing OpenAI and Anthropic Discord Presence apps.');
  const controllers=previous.find(n=>n.querySelector('h2')?.textContent==='Existing local controllers');if(controllers)presence.append(controllers);
  const checklist=card(toolsGroup,'presence-checklist','Check the visible Discord result after changing a presence app.');
  const oldChecklist=previous.find(n=>n.querySelector('h2')?.textContent==='Presence checklist');if(oldChecklist)checklist.append(oldChecklist);
  const recovery=card(toolsGroup,'betterdiscord-recovery','Recover the official BetterDiscord installer, then install or repair BetterDiscord.');
  el('p','The local recovery utility checks files every minute and can download a verified installer. This page is not connected to its live status or monitor switch.',recovery);
  el('p','Open betterdiscord-recovery-20261015.lnk from your downloaded output folder for the local recovery and extension controls. BetterDiscord’s installer is third-party software and uses its own interface.',recovery,'tower-note');
  const thirdParty=el('div',undefined,recovery,'tower-links');
  link(thirdParty,'Official BetterDiscord download ↗','https://betterdiscord.app/');
  link(thirdParty,'Installer releases ↗','https://github.com/BetterDiscord/Installer/releases');
  el('p','Third-party · downloaded to this PC · public source',recovery,'tower-version');
  const extensions=card(toolsGroup,'plugins-and-themes','Manage existing .plugin.js and .theme.css files through the local utility.');
  el('p','Use Import, Park, and Restore in the local utility. Extension inventory is not connected to this browser page yet. A parked extension is backed up before being removed from the active folder.',extensions);
  const chat=document.createElement('dialog');chat.id='tower-chat';chat.setAttribute('aria-labelledby','tower-chat-title');document.body.append(chat);
  const close=el('button','×',chat,'tower-close');close.setAttribute('aria-label','Close Discord Damsel chat');close.onclick=()=>chat.close();
  const title=el('h2',"Astra’s Cyber Deck — Discord Damsel Chat",chat);title.id='tower-chat-title';
  const chatStatus=el('p','Seat: empty. No AI account is connected to this page.',chat);
  el('p','Your subscriptions and messages have not been accessed. Connecting a compatible host is still needed before chat or guided tutorials can run.',chat);
  const openChat=(topic)=>{chatStatus.textContent=topic?topic+' — L3 is disconnected. This tutorial has not started.':'Seat: empty. No AI account is connected to this page.';chat.showModal();};
  for(const [id,label] of [['play-with-findastra-discord-presence','Play with Discord Damsel'],['care-for-findastra-discord-presence','Care for Discord Damsel']]){const body=card(tutorialGroup,id,label+' — guided tutorial connection pending.');const b=el('button','Open in Damsel chat',body);b.onclick=()=>openChat(label);}
  const clicker=card(aboutGroup,'clicker-training','Desktop click bindings are managed by the installed PetOS runtime.');el('p','This page has not verified the installed desktop bindings. The Damsel coin opens chat; it does not toggle a background service.',clicker);
  const backlog=card(aboutGroup,'backlog-health','Notes and health reports stay on this device.');backlogCount=el('p','',backlog);refreshStatus();
  const passport=card(aboutGroup,'pet-passport','Discord Damsel · Discord Tower · by Astra.');el('p','Interface v1.1 · 2026-10-15. Existing Damsel artwork preserved. Release signature and central permission enforcement are not verified by this page.',passport);
  const links=card(aboutGroup,'links','Source, documentation, and third-party software.');
  link(links,'Source · Astra · public ↗','https://github.com/findastra/findastra-discord-presence');el('br',undefined,links);
  link(links,'Pet Program Framework · docs ↗','https://github.com/findastra/astras-pet-os/blob/main/PET-PROGRAM-FRAMEWORK.md');
  // Every original card is preserved even if the legacy page acquires another feature.
  for(const old of previous)if(old.parentElement===main)card(toolsGroup,'additional-controls', 'Existing program controls.').append(old);
  const launcher=el('button',undefined,document.body);launcher.id='tower-chat-launcher';launcher.setAttribute('aria-label','Open Discord Damsel chat');launcher.setAttribute('aria-controls','tower-chat');launcher.onclick=()=>openChat();
  const coin=el('span',undefined,launcher,'tower-coin');coin.dataset.petCoin='';coin.setAttribute('aria-hidden','true');
  for(let i=0;i<9;i++){const edge=el('span',undefined,coin,'tower-edge');edge.style.maskImage='url("'+mascot.src+'")';edge.style.transform='translateZ('+((i-4)*.4)+'px)';}
  for(const cls of ['tower-face','tower-face tower-back']){const face=el('span',undefined,coin,cls),img=el('img',undefined,face);img.src=mascot.src;img.alt='';}
  for(const footer of document.querySelectorAll('body > footer'))footer.remove();
  const footer=el('footer',undefined,document.body,'tower-footer');el('p','HTML · CSS · JavaScript · MIT · Local notes stay in this browser.',footer);
  const signature=el('astra-footer',undefined,footer);signature.setAttribute('date','2026-10-15');
})();
