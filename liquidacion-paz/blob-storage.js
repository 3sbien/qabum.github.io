/* Paz's Sale — Vercel Blob photo storage bridge. Public crops + private originals. */
(function(){
  const DATA_PREFIX='data:image/';
  const PRIVATE_PATH='/api/paz-photos?action=private&src=';
  let migrating=false;

  function hasTeam(){
    try{return Boolean(window.PazSaleCloud?.getTeam?.())}catch{return false}
  }

  function isDataImage(v){return typeof v==='string'&&v.startsWith(DATA_PREFIX)}
  function isBlobPublic(v){
    try{return new URL(String(v||''),location.origin).hostname.endsWith('.public.blob.vercel-storage.com')}catch{return false}
  }
  function isPrivateRef(v){return typeof v==='string'&&v.startsWith(PRIVATE_PATH)}

  async function photoApi(method,body){
    const r=await fetch('/api/paz-photos',{
      method,
      credentials:'same-origin',
      cache:'no-store',
      headers:{accept:'application/json','content-type':'application/json'},
      body:body==null?undefined:JSON.stringify(body),
    });
    const text=await r.text();let data=null;if(text){try{data=JSON.parse(text)}catch{data={raw:text}}}
    if(!r.ok)throw new Error(data?.error||`Error ${r.status}`);
    return data;
  }

  function captureEditingOriginals(item){
    try{
      const same=Array.isArray(item?.photos)&&Array.isArray(editingPhotos)&&item.photos.length===editingPhotos.length&&item.photos.every((p,i)=>p===editingPhotos[i]);
      if(same&&Array.isArray(editingOriginalPhotos)&&editingOriginalPhotos.length===editingPhotos.length){
        item.photoOriginals=[...editingOriginalPhotos];
      }
    }catch(_){ }
  }

  async function uploadDataImage(kind,itemId,index,dataUrl){
    const d=await photoApi('POST',{kind,itemId,index,dataUrl});
    if(!d?.url)throw new Error('No se recibió la URL de la foto.');
    return d.url;
  }

  async function migrateItemPhotos(item){
    if(!item||!item.id)return false;
    captureEditingOriginals(item);
    let changed=false;

    const photos=Array.isArray(item.photos)?[...item.photos]:[];
    for(let i=0;i<photos.length;i++){
      if(isDataImage(photos[i])){
        photos[i]=await uploadDataImage('public',item.id,i,photos[i]);
        changed=true;
      }
    }
    if(changed)item.photos=photos;

    const originals=Array.isArray(item.photoOriginals)?[...item.photoOriginals]:[];
    let originalsChanged=false;
    for(let i=0;i<originals.length;i++){
      if(isDataImage(originals[i])){
        originals[i]=await uploadDataImage('private',item.id,i,originals[i]);
        originalsChanged=true;
      }
    }
    if(originalsChanged){item.photoOriginals=originals;changed=true;}
    if(changed)item.photoStorage='vercel-blob-v1';
    return changed;
  }

  function blobRefs(item){
    const out=[];
    for(const v of item?.photos||[])if(isBlobPublic(v))out.push(v);
    for(const v of item?.photoOriginals||[])if(isPrivateRef(v))out.push(v);
    return out;
  }

  async function cleanupRemoved(before,after){
    if(!before)return;
    const keep=new Set(blobRefs(after));
    const removed=blobRefs(before).filter(v=>!keep.has(v));
    if(removed.length){
      try{await photoApi('DELETE',{urls:removed})}catch(e){console.warn('Blob cleanup pending',e)}
    }
  }

  const baseDbPut=dbPut;
  dbPut=async function(item){
    const before=items.find(x=>x.id===item?.id);
    if(hasTeam()){
      try{
        await migrateItemPhotos(item);
        await cleanupRemoved(before,item);
      }catch(e){
        console.error('Paz Sale photo upload failed',e);
        if(typeof toast==='function')toast('Foto guardada localmente; queda pendiente subirla a la nube');
      }
    }
    return baseDbPut(item);
  };

  const baseDbDelete=dbDelete;
  dbDelete=async function(id){
    const before=items.find(x=>x.id===id);
    const refs=blobRefs(before);
    const result=await baseDbDelete(id);
    if(refs.length&&hasTeam()){
      try{await photoApi('DELETE',{urls:refs})}catch(e){console.warn('Blob cleanup pending',e)}
    }
    return result;
  };

  async function migrateExisting(){
    if(migrating)return;
    migrating=true;
    try{
      for(let attempt=0;attempt<120;attempt++){
        if(!hasTeam()){
          await new Promise(r=>setTimeout(r,1000));
          continue;
        }
        const candidates=[...items].filter(i=>(i.photos||[]).some(isDataImage)||(i.photoOriginals||[]).some(isDataImage));
        if(!candidates.length)return;
        for(const source of candidates){
          const item=typeof structuredClone==='function'?structuredClone(source):JSON.parse(JSON.stringify(source));
          try{
            const changed=await migrateItemPhotos(item);
            if(changed)await baseDbPut(item);
          }catch(e){console.warn('Existing photo migration pending',source?.id,e)}
        }
        return;
      }
    }finally{migrating=false;}
  }

  window.PazSalePhotos={migrate:()=>migrateExisting()};
  setTimeout(migrateExisting,1200);
})();
