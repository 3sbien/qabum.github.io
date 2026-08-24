/* Paz's Sale — temporary no-loss recovery guard.
   Preserves local IndexedDB rows before cloud replacement and restores missing rows
   through the normal authenticated dbPut pipeline. */
(function(){
  'use strict';
  const RESCUE_KEY='qabum_paz_rescue_items_v1';
  const TOMBSTONE_KEY='qabum_paz_rescue_deleted_v1';
  const originalGetAll=window.dbGetAll;
  const originalClear=window.dbClear;
  const originalDelete=window.dbDelete;
  if(typeof originalGetAll!=='function'||typeof originalClear!=='function'||typeof originalDelete!=='function')return;

  const readJson=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??fallback}catch{return fallback}};
  const writeJson=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const itemTime=i=>{const t=new Date(i?.updatedAt||i?.createdAt||0).getTime();return Number.isFinite(t)?t:0};

  async function snapshotLocal(){
    try{
      const rows=await originalGetAll();
      if(!Array.isArray(rows)||!rows.length)return rows||[];
      const prior=readJson(RESCUE_KEY,[]);
      const map=new Map((Array.isArray(prior)?prior:[]).filter(i=>i?.id).map(i=>[String(i.id),i]));
      for(const item of rows){
        if(!item?.id)continue;
        const old=map.get(String(item.id));
        if(!old||itemTime(item)>=itemTime(old))map.set(String(item.id),item);
      }
      writeJson(RESCUE_KEY,[...map.values()]);
      return rows;
    }catch(e){console.warn('Paz Sale rescue snapshot failed',e);return[]}
  }

  window.dbClear=async function(){
    await snapshotLocal();
    return originalClear.apply(this,arguments);
  };

  window.dbDelete=async function(id){
    try{
      const tomb=new Set(readJson(TOMBSTONE_KEY,[]).map(String));
      tomb.add(String(id));writeJson(TOMBSTONE_KEY,[...tomb]);
      const rescue=readJson(RESCUE_KEY,[]).filter(i=>String(i?.id)!==String(id));
      writeJson(RESCUE_KEY,rescue);
    }catch(e){console.warn(e)}
    return originalDelete.call(this,id);
  };

  async function restoreMissing(){
    try{
      const team=window.PazSaleCloud?.getTeam?.();
      if(!team)return 0;
      const rescue=readJson(RESCUE_KEY,[]);
      if(!Array.isArray(rescue)||!rescue.length)return 0;
      const tomb=new Set(readJson(TOMBSTONE_KEY,[]).map(String));
      const current=await originalGetAll();
      const have=new Set((current||[]).map(i=>String(i.id)));
      let restored=0;
      for(const item of rescue){
        if(!item?.id||tomb.has(String(item.id))||have.has(String(item.id)))continue;
        if(typeof window.dbPut!=='function')break;
        await window.dbPut(item);
        have.add(String(item.id));restored++;
      }
      if(restored){
        console.info(`Paz Sale rescue restored ${restored} item(s)`);
        setTimeout(()=>{try{window.PazSaleCloud?.sync?.()}catch(_){}},300);
      }
      return restored;
    }catch(e){console.warn('Paz Sale rescue restore failed',e);return 0}
  }

  window.PazSaleNoLoss={snapshot:snapshotLocal,restore:restoreMissing};
  setTimeout(restoreMissing,3500);
  window.addEventListener('focus',()=>setTimeout(restoreMissing,500));
})();
