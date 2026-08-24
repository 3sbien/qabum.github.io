/* Paz's Sale — durable sync safety layer. */
(function(){
  'use strict';
  const PENDING_KEY='qabum_paz_pending_item_ids_v2';
  const LAST_SYNC_KEY='qabum_paz_server_last_sync_v1';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function waitForCloudWrap(){
    for(let i=0;i<200;i++){
      try{
        const ready=typeof db!=='undefined'&&db&&typeof dbGetAll==='function'&&typeof dbPut==='function'&&typeof dbDelete==='function'&&typeof dbClear==='function'&&String(dbGetAll).includes('fetchRemoteRows')&&String(dbPut).includes('saveRemoteItem');
        if(ready)return true;
      }catch(_){ }
      await sleep(50);
    }
    return false;
  }

  async function install(){
    const ready=await waitForCloudWrap();
    if(!ready)throw new Error('Cloud sync wrapper did not become ready');

    const cloudPut=dbPut;
    const cloudDelete=dbDelete;
    const cloudClear=dbClear;

    const readPending=()=>{try{return new Set(JSON.parse(localStorage.getItem(PENDING_KEY)||'[]').map(String))}catch{return new Set()}};
    const writePending=set=>localStorage.setItem(PENDING_KEY,JSON.stringify([...set]));
    const addPending=id=>{const s=readPending();s.add(String(id));writePending(s)};
    const removePending=id=>{const s=readPending();s.delete(String(id));writePending(s)};

    function rawGetAll(){
      return new Promise((resolve,reject)=>{
        try{
          const r=db.transaction(STORE).objectStore(STORE).getAll();
          r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);
        }catch(e){reject(e)}
      });
    }

    async function remoteIds(){
      try{
        const r=await fetch('/api/paz/items',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
        if(!r.ok)return null;
        const data=await r.json();
        return new Set((data?.items||[]).map(row=>String(row.id||row.payload?.id||'')).filter(Boolean));
      }catch{return null}
    }

    async function confirmRemote(id){
      const ids=await remoteIds();
      if(!ids)return false;
      const ok=ids.has(String(id));
      if(ok)removePending(id);
      return ok;
    }

    // Ordinary UI refreshes may never replace local storage with a cloud-only snapshot.
    dbGetAll=async function(){return rawGetAll()};

    dbPut=async function(item){
      if(item?.id)addPending(item.id);
      await cloudPut(item);
      if(item?.id)await confirmRemote(item.id);
    };

    dbDelete=async function(id){
      removePending(id);
      return cloudDelete(id);
    };

    dbClear=async function(){
      writePending(new Set());
      return cloudClear();
    };

    async function bootstrapPending(){
      const ids=await remoteIds();
      if(!ids)return;
      const rows=await rawGetAll();
      const lastSync=new Date(localStorage.getItem(LAST_SYNC_KEY)||0).getTime()||0;
      const pending=readPending();
      for(const item of rows){
        if(!item?.id||ids.has(String(item.id)))continue;
        const t=new Date(item.updatedAt||item.createdAt||0).getTime()||0;
        if(t>lastSync)pending.add(String(item.id));
      }
      writePending(pending);
    }

    let retrying=false;
    async function retryPending(){
      if(retrying||document.visibilityState==='hidden')return;
      retrying=true;
      try{
        await bootstrapPending();
        const pending=readPending();
        if(!pending.size)return;
        const rows=await rawGetAll();
        const map=new Map(rows.map(i=>[String(i.id),i]));
        for(const id of [...pending]){
          const item=map.get(String(id));
          if(!item){removePending(id);continue;}
          await cloudPut(item);
          await confirmRemote(id);
        }
      }catch(e){console.warn('Paz Sale pending sync retry failed',e)}
      finally{retrying=false}
    }

    setTimeout(retryPending,2500);
    setInterval(retryPending,15000);
    window.addEventListener('focus',()=>setTimeout(retryPending,300));
    window.addEventListener('online',()=>setTimeout(retryPending,300));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(retryPending,300)});

    window.PazSaleSyncSafety={retry:retryPending,pending:()=>[...readPending()]};
    return true;
  }

  window.PazSaleSyncSafetyReady=install().catch(e=>{console.error('Paz Sale sync safety failed to install',e);throw e});
})();
