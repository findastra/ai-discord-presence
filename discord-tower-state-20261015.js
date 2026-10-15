/* Local state contract. OpenAI Codex GPT-6, 2026-10-15. */
(() => {
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const normalize=value=>{
    const result={schema:2,tools:{},backlog:[]};
    if(!object(value)||value.schema!==2)return result;
    if(object(value.tools))for(const [id,state] of Object.entries(value.tools)){
      if(!/^[a-z][a-z0-9-]{0,119}$/.test(id)||!object(state))continue;
      result.tools[id]={enabled:state.enabled!==false,sick:state.sick===true};
    }
    if(Array.isArray(value.backlog))result.backlog=value.backlog.filter(object).map(entry=>{
      const clean={};for(const field of ['id','created','author','kind','tool','text','status','version'])if(typeof entry[field]==='string')clean[field]=entry[field];
      return clean;
    });
    return result;
  };
  const merge=(current,incoming)=>{
    if(!object(incoming)||incoming.schema!==2||!object(incoming.tools)||!Array.isArray(incoming.backlog))throw Error('Choose a Discord Tower schema 2 export.');
    const result=normalize(current),addition=normalize(incoming);
    const seen=new Set(result.backlog.map(e=>e.id||JSON.stringify(e)));
    for(const entry of addition.backlog){const id=entry.id||JSON.stringify(entry);if(!seen.has(id)){seen.add(id);result.backlog.push(entry);}}
    // Import never enables an existing OFF tool or clears an existing maintenance flag.
    for(const [id,value] of Object.entries(addition.tools)){const old=result.tools[id];result.tools[id]=old?{enabled:old.enabled&&value.enabled,sick:old.sick||value.sick}:value;}
    return result;
  };
  globalThis.DiscordTowerState={normalize,merge};
})();
