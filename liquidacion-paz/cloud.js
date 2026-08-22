/* Paz's Sale — shared Neon inventory + public catalog */
(function(){
  const OWNER_ID='75e74199-df4e-4905-b424-8871c8cc43bc';
  const AUTH_URL='https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
  const DATA_URL='https://ep-silent-credit-awhuo8p7.apirest.c-12.us-east-1.aws.neon.tech/neondb/rest/v1';
  const CATALOG_URL='./catalogo/';
  const DIRTY_KEY='qabum_paz_cloud_dirty_v2';
  const DELETES_KEY='qabum_paz_cloud_deletes_v2';
  const LAST_SYNC_KEY='qabum_paz_cloud_last_sync_v2';
  const LAST_TEAM_KEY='qabum_paz_cloud_last_team_v2';

  let neonClient=null;
  let cloudUser=null;
  let teamMember=null;
  let cloudReady=false;
  let syncing=false;
  let dirty=localStorage.getItem(DIRTY_KEY)==='1';
  let localGetAll=null, localPut=null, localDelete=null, localClear=null;
  let localGetSettings=null, localSaveSettings=null;

  const markDirty=()=>{dirty=true;localStorage.setItem(DIRTY_KEY,'1');setCloudState('pending','Pendiente');};
  const clearDirty=()=>{dirty=false;localStorage.removeItem(DIRTY_KEY);};
  const getDeleteQueue=()=>{try{return JSON.parse(localStorage.getItem(DELETES_KEY)||'[]')}catch{return []}};
  const setDeleteQueue=(arr)=>localStorage.setItem(DELETES_KEY,JSON.stringify([...new Set(arr)]));
  const addDelete=(id)=>setDeleteQueue([...getDeleteQueue(),id]);
  const hasKnownTeam=()=>!!localStorage.getItem(LAST_TEAM_KEY);

  function addCloudStyles(){
    if(document.querySelector('link[href="cloud.css?v=2"]')) return;
    document.querySelectorAll('link[href^="cloud.css"]').forEach(x=>x.remove());
    const l=document.createElement('link');l.rel='stylesheet';l.href='cloud.css?v=2';document.head.appendChild(l);
  }

  function installHeaderStatus(){
    const top=document.querySelector('.topbar');
    if(!top || document.getElementById('cloudHeaderStatus')) return;
    const el=document.createElement('div');
    el.id='cloudHeaderStatus';el.className='cloud-header-status waiting';
    el.innerHTML='<span class="cloud-dot"></span><span id="cloudHeaderText">Conectando</span>';
    const brand=top.querySelector('.brand-link');
    if(brand) top.insertBefore(el,brand); else top.appendChild(el);
  }

  function installCloudUi(){
    const settings=document.getElementById('settings');
    if(!settings || document.getElementById('cloudCard')) return;
    const card=document.createElement('div');
    card.id='cloudCard';card.className='cloud-card';
    card.innerHTML=`
      <h3>Cuenta y catálogo en vivo</h3>
      <p>Con sesión activa, el inventario completo se comparte entre los administradores. El catálogo público recibe únicamente foto, descripción, categoría, estado y precio publicado.</p>
      <div id="cloudStatus" class="cloud-status waiting"><span>Estado</span><strong>Conectando…</strong></div>
      <div id="cloudGuest">
        <div class="cloud-grid">
          <div class="field cloud-full"><label for="cloudName">Nombre</label><input id="cloudName" maxlength="80" placeholder="Nombre"></div>
          <div class="field"><label for="cloudEmail">Email</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="correo@ejemplo.com"></div>
          <div class="field"><label for="cloudPassword">Contraseña</label><input id="cloudPassword" type="password" minlength="8" autocomplete="current-password" placeholder="Mínimo 8 caracteres"></div>
        </div>
        <div class="cloud-actions"><button type="button" id="cloudSignIn" class="btn dark">Entrar</button><button type="button" id="cloudSignUp" class="btn ghost">Crear cuenta</button></div>
      </div>
      <div id="cloudLogged" class="cloud-hidden">
        <p>Sesión: <strong id="cloudUserLabel"></strong> <span id="cloudRole" class="cloud-role"></span></p>
        <div id="cloudAccessNote" class="cloud-access-note"></div>
        <div class="cloud-actions"><button type="button" id="cloudSync" class="btn dark">Sincronizar ahora</button><a id="cloudCatalogLink" class="btn ghost" href="${CATALOG_URL}" target="_blank" rel="noopener">Abrir catálogo en vivo</a><button type="button" id="cloudSignOut" class="btn ghost">Salir</button></div>
      </div>
      <div id="cloudError" class="cloud-error"></div>
      <p class="cloud-note">Los datos internos —precios mínimo/máximo/venta rápida, compradores, ventas, pagos y saldos— solo están disponibles para propietarios y administradores autenticados.</p>`;
    settings.appendChild(card);
    document.getElementById('cloudSignIn').addEventListener('click',()=>cloudLogin(false));
    document.getElementById('cloudSignUp').addEventListener('click',()=>cloudLogin(true));
    document.getElementById('cloudSignOut').addEventListener('click',cloudLogout);
    document.getElementById('cloudSync').addEventListener('click',()=>syncAll(true));
  }

  function setCloudState(kind,text){
    const box=document.getElementById('cloudStatus');
    if(box){box.className=`cloud-status ${kind}`;box.innerHTML=`<span>Estado</span><strong>${text}</strong>`;}
    const head=document.getElementById('cloudHeaderStatus');
    if(head){head.className=`cloud-header-status ${kind}`;const t=document.getElementById('cloudHeaderText');if(t)t.textContent=text;}
  }
  function setCloudError(text=''){const el=document.getElementById('cloudError');if(el)el.textContent=text;}
  function authMessage(err){return err?.message||err?.error?.message||err?.data?.message||String(err||'No se pudo completar la operación');}
  function normalizeSession(result){
    const root=result?.data ?? result ?? null;
    if(root?.user) return {user:root.user,session:root.session};
    if(root?.session?.user) return {user:root.session.user,session:root.session};
    return null;
  }

  async function loadTeamMember(){
    teamMember=null;
    if(!cloudUser||!neonClient) return null;
    const {data,error}=await neonClient.from('paz_sale_team_members').select('user_id,owner_user_id,role,display_name').eq('user_id',cloudUser.id).limit(1);
    if(error) throw error;
    teamMember=data?.[0]||null;
    if(teamMember) localStorage.setItem(LAST_TEAM_KEY,JSON.stringify(teamMember));
    return teamMember;
  }

  async function refreshSession(){
    if(!neonClient) return null;
    try{
      const r=await neonClient.auth.getSession();
      const s=normalizeSession(r);cloudUser=s?.user||null;
      if(cloudUser) await loadTeamMember(); else teamMember=null;
    }catch(e){console.warn(e);cloudUser=null;teamMember=null;}
    renderCloudSession();return cloudUser;
  }

  function renderCloudSession(){
    const guest=document.getElementById('cloudGuest'),logged=document.getElementById('cloudLogged');
    if(!guest||!logged)return;
    if(cloudUser){
      guest.classList.add('cloud-hidden');logged.classList.remove('cloud-hidden');
      document.getElementById('cloudUserLabel').textContent=cloudUser.email||cloudUser.name||'Cuenta activa';
      const role=document.getElementById('cloudRole');
      role.textContent=teamMember?(teamMember.role==='OWNER'?'Propietaria':'Administrador'):'Sin acceso';
      const note=document.getElementById('cloudAccessNote');
      const sync=document.getElementById('cloudSync'),cat=document.getElementById('cloudCatalogLink');
      if(teamMember){
        note.textContent='';sync.disabled=false;cat.classList.remove('cloud-hidden');
        setCloudState(dirty?'pending':'synced',dirty?'Pendiente':'Sincronizado');
      }else{
        note.textContent='La cuenta está creada pero todavía no ha sido habilitada como administradora de Paz\'s Sale.';
        sync.disabled=true;cat.classList.add('cloud-hidden');setCloudState('pending','Pendiente autorización');
      }
    }else{
      guest.classList.remove('cloud-hidden');logged.classList.add('cloud-hidden');
      setCloudState(cloudReady?'offline':'waiting',cloudReady?'Sin sesión':'Conectando');
    }
  }

  async function cloudLogin(create){
    setCloudError('');
    if(!neonClient) return setCloudError('La conexión todavía está cargando.');
    const email=document.getElementById('cloudEmail').value.trim();
    const password=document.getElementById('cloudPassword').value;
    const name=document.getElementById('cloudName').value.trim()||'Usuario';
    if(!email||password.length<8) return setCloudError('Ingresa un email válido y una contraseña de al menos 8 caracteres.');
    try{
      setCloudState('waiting',create?'Creando cuenta':'Entrando');
      const r=create ? await neonClient.auth.signUp.email({email,password,name}) : await neonClient.auth.signIn.email({email,password,rememberMe:true});
      if(r?.error) throw r.error;
      await refreshSession();
      if(!cloudUser) throw new Error('La sesión no quedó activa. Intenta entrar nuevamente.');
      if(teamMember) await syncAll(true); else toast('Cuenta creada. Falta habilitarla como administradora.');
    }catch(e){console.error(e);setCloudError(authMessage(e));setCloudState('error','Error de acceso');}
  }

  async function cloudLogout(){
    try{await neonClient.auth.signOut();}catch(e){console.warn(e);}
    cloudUser=null;teamMember=null;renderCloudSession();setCloudError('');
    if(typeof refresh==='function') await refresh();
  }

  function canvasImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
  async function publicPhoto(src){
    if(!src) return null;
    try{
      const im=await canvasImage(src),max=1100,scale=Math.min(1,max/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.72);
    }catch(e){console.warn('Public photo conversion failed',e);return src;}
  }

  async function publicPayload(item){
    const photo=await publicPhoto(item.photos?.[0]);
    return {id:item.id,owner_user_id:teamMember.owner_user_id,title:item.title||'',description:item.description||'',category:item.category||'',status:item.status||'DISPONIBLE',asking_price:Number(item.askingPrice||0),photos:photo?[photo]:[],updated_at:new Date().toISOString()};
  }

  async function savePrivateItem(item){
    const row={id:item.id,payload:item,updated_at:new Date().toISOString(),updated_by:cloudUser.id};
    const {error}=await neonClient.from('paz_sale_private_items').upsert(row,{onConflict:'id'});if(error)throw error;
  }
  async function syncPublicItem(item){
    const payload=await publicPayload(item);
    const {error}=await neonClient.from('paz_sale_public_items').upsert(payload,{onConflict:'id'});if(error)throw error;
  }
  async function deleteCloudItem(id){
    let r=await neonClient.from('paz_sale_private_items').delete().eq('id',id);if(r.error)throw r.error;
    r=await neonClient.from('paz_sale_public_items').delete().eq('id',id).eq('owner_user_id',teamMember.owner_user_id);if(r.error)throw r.error;
  }
  async function saveCloudSettings(){
    const s=localGetSettings();
    let r=await neonClient.from('paz_sale_private_settings').upsert({id:'main',payload:s,updated_at:new Date().toISOString(),updated_by:cloudUser.id},{onConflict:'id'});if(r.error)throw r.error;
    r=await neonClient.from('paz_sale_public_settings').upsert({owner_user_id:teamMember.owner_user_id,catalog_title:s.catalogTitle||"Paz's Sale",contact_name:s.contactName||'',contact_phone:s.contactPhone||'',location_text:s.locationText||'',updated_at:new Date().toISOString()},{onConflict:'owner_user_id'});if(r.error)throw r.error;
  }

  async function fetchPrivateRows(){
    const {data,error}=await neonClient.from('paz_sale_private_items').select('id,payload,updated_at').order('updated_at',{ascending:false});
    if(error)throw error;return data||[];
  }
  async function replaceLocal(itemsToStore){
    await localClear();
    for(const item of itemsToStore) await localPut(item);
  }
  async function pullSettings(){
    const {data,error}=await neonClient.from('paz_sale_private_settings').select('payload,updated_at').eq('id','main').limit(1);
    if(error)throw error;
    if(data?.[0]?.payload){localSaveSettings(data[0].payload);return true;}
    return false;
  }

  function itemTime(item){const t=new Date(item?.updatedAt||item?.createdAt||0).getTime();return Number.isFinite(t)?t:0;}
  async function mergeCloudAndLocal(){
    const local=await localGetAll();
    const rows=await fetchPrivateRows();
    const remote=rows.map(r=>r.payload).filter(Boolean);
    const lastSync=new Date(localStorage.getItem(LAST_SYNC_KEY)||0).getTime()||0;

    if(!rows.length && local.length && teamMember.role==='OWNER'){
      for(const item of local){await savePrivateItem(item);await syncPublicItem(item);}
      await saveCloudSettings();
      return local;
    }

    const deletes=getDeleteQueue();
    for(const id of deletes){await deleteCloudItem(id);}
    setDeleteQueue([]);

    const rmap=new Map(remote.map(i=>[i.id,i]));
    if(dirty){
      for(const li of local){
        const ri=rmap.get(li.id);
        if(ri){
          if(itemTime(li)>itemTime(ri)){await savePrivateItem(li);await syncPublicItem(li);rmap.set(li.id,li);}
        }else if(itemTime(li)>lastSync){
          await savePrivateItem(li);await syncPublicItem(li);rmap.set(li.id,li);
        }
      }
    }
    return [...rmap.values()];
  }

  async function syncAll(showMessage=false){
    if(syncing)return;
    if(!cloudUser||!teamMember||!neonClient){if(showMessage)setCloudError('Esta cuenta todavía no tiene acceso al equipo.');return;}
    syncing=true;setCloudError('');setCloudState('waiting','Sincronizando');
    try{
      const merged=await mergeCloudAndLocal();
      await replaceLocal(merged);
      const hasRemoteSettings=await pullSettings();
      if(!hasRemoteSettings) await saveCloudSettings(); else await saveCloudSettings();
      clearDirty();localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());
      setCloudState('synced',`Sincronizado · ${merged.length}`);
      if(typeof renderAll==='function') renderAll();
      if(showMessage) toast('Inventario compartido actualizado');
    }catch(e){console.error(e);markDirty();setCloudError(authMessage(e));setCloudState('error','Pendiente');}
    finally{syncing=false;}
  }

  function wrapStorageFunctions(){
    if(window.__pazSharedCloudWrapped)return;window.__pazSharedCloudWrapped=true;
    localGetAll=dbGetAll;localPut=dbPut;localDelete=dbDelete;localClear=dbClear;
    localGetSettings=getSettings;localSaveSettings=saveSettings;

    dbGetAll=async function(){
      if(cloudUser&&teamMember&&!dirty){
        try{
          const rows=await fetchPrivateRows();
          const remote=rows.map(r=>r.payload).filter(Boolean);
          await replaceLocal(remote);return remote;
        }catch(e){console.warn(e);setCloudState('error','Sin conexión');}
      }
      return localGetAll();
    };

    dbPut=async function(item){
      await localPut(item);
      if(cloudUser&&teamMember){
        try{setCloudState('waiting','Sincronizando');await savePrivateItem(item);await syncPublicItem(item);clearDirty();localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());setCloudState('synced','Sincronizado');}
        catch(e){console.error(e);markDirty();setCloudError(authMessage(e));}
      }else if(hasKnownTeam()) markDirty();
    };

    dbDelete=async function(id){
      await localDelete(id);
      if(cloudUser&&teamMember){
        try{setCloudState('waiting','Sincronizando');await deleteCloudItem(id);clearDirty();localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());setCloudState('synced','Sincronizado');}
        catch(e){console.error(e);addDelete(id);markDirty();setCloudError(authMessage(e));}
      }else if(hasKnownTeam()){addDelete(id);markDirty();}
    };

    dbClear=async function(){
      await localClear();
      if(cloudUser&&teamMember){
        try{
          let r=await neonClient.from('paz_sale_private_items').delete().neq('id','__never__');if(r.error)throw r.error;
          r=await neonClient.from('paz_sale_public_items').delete().eq('owner_user_id',teamMember.owner_user_id);if(r.error)throw r.error;
          clearDirty();setCloudState('synced','Sincronizado');
        }catch(e){console.error(e);markDirty();setCloudError(authMessage(e));}
      }else if(hasKnownTeam())markDirty();
    };

    const sf=document.getElementById('settingsForm');
    if(sf)sf.addEventListener('submit',()=>setTimeout(async()=>{
      if(cloudUser&&teamMember){try{setCloudState('waiting','Sincronizando');await saveCloudSettings();setCloudState('synced','Sincronizado');}catch(e){markDirty();setCloudError(authMessage(e));}}
      else if(hasKnownTeam())markDirty();
    },0));
  }

  async function initCloud(){
    addCloudStyles();installHeaderStatus();installCloudUi();wrapStorageFunctions();
    try{
      const mod=await import('https://esm.sh/@neondatabase/neon-js?bundle&target=es2022');
      neonClient=mod.createClient({auth:{adapter:mod.BetterAuthVanillaAdapter(),url:AUTH_URL,allowAnonymous:true},dataApi:{url:DATA_URL}});
      cloudReady=true;await refreshSession();
      if(cloudUser&&teamMember) await syncAll(false); else renderCloudSession();
    }catch(e){console.error('Neon init failed',e);cloudReady=false;setCloudError('No se pudo conectar al inventario compartido. Puedes seguir trabajando localmente.');setCloudState('error','Sin conexión');}
  }

  window.PazSaleCloud={sync:()=>syncAll(true),getUser:()=>cloudUser,getTeam:()=>teamMember};
  initCloud();
})();