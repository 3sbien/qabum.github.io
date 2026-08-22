/* Paz's Sale — universal first-party auth + server-side Neon sync */
(function(){
  const DIRTY_KEY='qabum_paz_server_dirty_v1';
  const DELETES_KEY='qabum_paz_server_deletes_v1';
  const LAST_SYNC_KEY='qabum_paz_server_last_sync_v1';
  const LAST_TEAM_KEY='qabum_paz_server_last_team_v1';
  const CATALOG_URL=location.hostname==='pazventa.qabum.com'?'/catalogo/':'./catalogo/';

  let cloudUser=null;
  let teamMember=null;
  let cloudReady=false;
  let syncing=false;
  let wrapped=false;
  let dirty=localStorage.getItem(DIRTY_KEY)==='1';
  let localGetAll=null,localPut=null,localDelete=null,localClear=null;
  let localGetSettings=null,localSaveSettings=null;

  const markDirty=()=>{dirty=true;localStorage.setItem(DIRTY_KEY,'1');setCloudState('pending','Pendiente');};
  const clearDirty=()=>{dirty=false;localStorage.removeItem(DIRTY_KEY);};
  const getDeleteQueue=()=>{try{return JSON.parse(localStorage.getItem(DELETES_KEY)||'[]')}catch{return []}};
  const setDeleteQueue=(arr)=>localStorage.setItem(DELETES_KEY,JSON.stringify([...new Set(arr)]));
  const addDelete=(id)=>setDeleteQueue([...getDeleteQueue(),id]);

  async function api(path,options={}){
    const headers={accept:'application/json',...(options.headers||{})};
    if(options.body!=null&&!headers['content-type'])headers['content-type']='application/json';
    const r=await fetch(`/api/paz/${path}`,{
      method:options.method||'GET',
      credentials:'same-origin',
      cache:'no-store',
      headers,
      body:options.body==null?undefined:(typeof options.body==='string'?options.body:JSON.stringify(options.body)),
    });
    let data=null;const text=await r.text();if(text){try{data=JSON.parse(text)}catch{data={raw:text}}}
    if(!r.ok){
      const e=new Error(data?.message||data?.error||`Error ${r.status}`);e.status=r.status;e.data=data;
      if(r.status===401){cloudUser=null;teamMember=null;renderCloudSession();setCloudState('offline','Sesión vencida');}
      throw e;
    }
    return data;
  }

  function installHeaderStatus(){
    const top=document.querySelector('.topbar');
    if(!top||document.getElementById('cloudHeaderStatus'))return;
    const el=document.createElement('div');el.id='cloudHeaderStatus';el.className='cloud-header-status waiting';
    el.innerHTML='<span class="cloud-dot"></span><span id="cloudHeaderText">Conectando</span>';
    const brand=top.querySelector('.brand-link');if(brand)top.insertBefore(el,brand);else top.appendChild(el);
  }

  function installCloudUi(){
    const settings=document.getElementById('settings');
    if(!settings||document.getElementById('cloudCard'))return;
    const card=document.createElement('div');card.id='cloudCard';card.className='cloud-card';
    const returnTo=`${location.pathname}${location.search}`.replace(/([?&])auth=[^&]*/,'$1').replace(/[?&]$/,'')||'/liquidacion-paz/';
    card.innerHTML=`
      <h3>Cuenta y catálogo en vivo</h3>
      <p>Un solo acceso para iPhone, iPad y computador. La sesión y los datos privados se procesan en el servidor de Qabum.</p>
      <div id="cloudStatus" class="cloud-status waiting"><span>Estado</span><strong>Conectando…</strong></div>
      <div id="cloudGuest">
        <form id="cloudLoginForm" method="post" action="/api/paz/login">
          <input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}">
          <div class="cloud-grid">
            <div class="field cloud-full"><label for="cloudName">Nombre <small>(solo al crear cuenta)</small></label><input id="cloudName" name="name" maxlength="80" autocomplete="name" placeholder="Nombre"></div>
            <div class="field"><label for="cloudEmail">Email</label><input id="cloudEmail" name="email" type="email" autocomplete="email" required placeholder="correo@ejemplo.com"></div>
            <div class="field"><label for="cloudPassword">Contraseña</label><input id="cloudPassword" name="password" type="password" minlength="8" autocomplete="current-password" required placeholder="Mínimo 8 caracteres"></div>
          </div>
          <div class="cloud-actions"><button type="submit" class="btn dark">Entrar</button><button type="submit" formaction="/api/paz/signup" class="btn ghost">Crear cuenta</button></div>
        </form>
      </div>
      <div id="cloudLogged" class="cloud-hidden">
        <p>Sesión: <strong id="cloudUserLabel"></strong> <span id="cloudRole" class="cloud-role"></span></p>
        <div id="cloudAccessNote" class="cloud-access-note"></div>
        <div class="cloud-actions"><button type="button" id="cloudSync" class="btn dark">Sincronizar ahora</button><a id="cloudCatalogLink" class="btn ghost" href="${CATALOG_URL}" target="_blank" rel="noopener">Abrir catálogo en vivo</a><button type="button" id="cloudSignOut" class="btn ghost">Salir</button></div>
      </div>
      <div id="cloudError" class="cloud-error"></div>
      <p class="cloud-note">Los datos internos —precios mínimo/máximo/venta rápida, compradores, ventas, pagos, saldos y fotos originales— solo están disponibles para propietarios y administradores autenticados.</p>`;
    settings.appendChild(card);
    document.getElementById('cloudSync').addEventListener('click',()=>syncAll(true));
    document.getElementById('cloudSignOut').addEventListener('click',cloudLogout);
    showAuthQueryMessage();
  }

  function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function setCloudError(text=''){const el=document.getElementById('cloudError');if(el)el.textContent=text;}
  function setCloudState(kind,text){
    const box=document.getElementById('cloudStatus');if(box){box.className=`cloud-status ${kind}`;box.innerHTML=`<span>Estado</span><strong>${escapeHtml(text)}</strong>`;}
    const head=document.getElementById('cloudHeaderStatus');if(head){head.className=`cloud-header-status ${kind}`;const t=document.getElementById('cloudHeaderText');if(t)t.textContent=text;}
  }

  function showAuthQueryMessage(){
    const u=new URL(location.href),code=u.searchParams.get('auth');if(!code)return;
    const messages={invalid:'No se pudo iniciar sesión. Revisa email y contraseña.',created:'Cuenta creada. Si es una cuenta nueva, falta habilitarla en el equipo.',exists:'Ese email ya tiene una cuenta. Usa Entrar.',signup:'No se pudo crear la cuenta.'};
    if(code!=='ok')setCloudError(messages[code]||'No se pudo completar el acceso.');
    u.searchParams.delete('auth');history.replaceState(null,'',u.pathname+(u.searchParams.size?`?${u.searchParams}`:'')+u.hash);
  }

  async function refreshSession(){
    try{
      const s=await api('session');
      cloudUser=s?.authenticated?s.user:null;teamMember=s?.member||null;
      if(teamMember)localStorage.setItem(LAST_TEAM_KEY,JSON.stringify(teamMember));
    }catch(e){console.warn('Session refresh failed',e);cloudUser=null;teamMember=null;}
    renderCloudSession();return cloudUser;
  }

  function renderCloudSession(){
    const guest=document.getElementById('cloudGuest'),logged=document.getElementById('cloudLogged');if(!guest||!logged)return;
    if(cloudUser){
      guest.classList.add('cloud-hidden');logged.classList.remove('cloud-hidden');
      document.getElementById('cloudUserLabel').textContent=cloudUser.email||cloudUser.name||'Cuenta activa';
      const role=document.getElementById('cloudRole');role.textContent=teamMember?(teamMember.role==='OWNER'?'Propietaria':'Administrador'):'Sin acceso';
      const note=document.getElementById('cloudAccessNote'),sync=document.getElementById('cloudSync'),cat=document.getElementById('cloudCatalogLink');
      if(teamMember){note.textContent='';sync.disabled=false;cat.classList.remove('cloud-hidden');setCloudState(dirty?'pending':'synced',dirty?'Pendiente':'Sincronizado');}
      else{note.textContent='La cuenta está creada pero todavía no ha sido habilitada como administradora de Paz\'s Sale.';sync.disabled=true;cat.classList.add('cloud-hidden');setCloudState('pending','Pendiente autorización');}
    }else{
      guest.classList.remove('cloud-hidden');logged.classList.add('cloud-hidden');setCloudState(cloudReady?'offline':'waiting',cloudReady?'Sin sesión':'Conectando');
    }
  }

  async function cloudLogout(){
    setCloudError('');
    try{await api('logout',{method:'POST',body:{}});}catch(e){console.warn(e);}
    cloudUser=null;teamMember=null;renderCloudSession();
    if(typeof refresh==='function')await refresh();
  }

  async function fetchRemoteRows(){const d=await api('items');return d?.items||[];}
  async function saveRemoteItem(item){return api('items',{method:'PUT',body:{item}});}
  async function deleteRemoteItem(id){return api(`items?id=${encodeURIComponent(id)}`,{method:'DELETE'});}
  async function deleteAllRemote(){return api('items?all=1',{method:'DELETE'});}
  async function fetchRemoteSettings(){const d=await api('settings');return d?.settings||null;}
  async function saveRemoteSettings(){return api('settings',{method:'PUT',body:{settings:localGetSettings()}});}

  async function replaceLocal(list){await localClear();for(const item of list)await localPut(item);}
  function itemTime(item){const t=new Date(item?.updatedAt||item?.createdAt||0).getTime();return Number.isFinite(t)?t:0;}
  function updateVisibleItems(list){
    try{items=[...list].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));if(typeof renderAll==='function')renderAll();}catch(e){console.warn(e);}
  }

  async function mergeCloudAndLocal(){
    const local=await localGetAll();const rows=await fetchRemoteRows();const remote=rows.map(r=>r.payload).filter(Boolean);const lastSync=new Date(localStorage.getItem(LAST_SYNC_KEY)||0).getTime()||0;
    if(!rows.length&&local.length&&teamMember?.role==='OWNER'){
      for(const item of local)await saveRemoteItem(item);
      return local;
    }
    for(const id of getDeleteQueue())await deleteRemoteItem(id);setDeleteQueue([]);
    const rmap=new Map(remote.map(i=>[i.id,i]));
    if(dirty){
      for(const li of local){
        const ri=rmap.get(li.id);
        if(ri){if(itemTime(li)>itemTime(ri)){await saveRemoteItem(li);rmap.set(li.id,li);}}
        else if(itemTime(li)>lastSync){await saveRemoteItem(li);rmap.set(li.id,li);}
      }
    }
    return [...rmap.values()];
  }

  async function syncSettings(){
    const remote=await fetchRemoteSettings();
    if(remote)localSaveSettings(remote);else await saveRemoteSettings();
  }

  async function syncAll(showMessage=false){
    if(syncing)return;if(!cloudUser||!teamMember){if(showMessage)setCloudError('Esta cuenta todavía no tiene acceso al equipo.');return;}
    syncing=true;setCloudError('');setCloudState('waiting','Sincronizando');
    try{
      const merged=await mergeCloudAndLocal();await replaceLocal(merged);await syncSettings();clearDirty();localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());
      updateVisibleItems(merged);setCloudState('synced',`Sincronizado · ${merged.length}`);if(showMessage&&typeof toast==='function')toast('Inventario compartido actualizado');
    }catch(e){console.error('Paz Sale sync failed',e);markDirty();setCloudError(e?.message||'No se pudo sincronizar.');setCloudState('error','Pendiente');}
    finally{syncing=false;}
  }

  function wrapStorageFunctions(){
    if(wrapped||typeof dbGetAll!=='function'||!db)return false;wrapped=true;
    localGetAll=dbGetAll;localPut=dbPut;localDelete=dbDelete;localClear=dbClear;localGetSettings=getSettings;localSaveSettings=saveSettings;

    dbGetAll=async function(){
      if(cloudUser&&teamMember&&!dirty&&!syncing){
        try{const rows=await fetchRemoteRows();const remote=rows.map(r=>r.payload).filter(Boolean);await replaceLocal(remote);return remote;}catch(e){console.warn(e);setCloudState('error','Sin conexión');}
      }
      return localGetAll();
    };

    dbPut=async function(item){
      await localPut(item);markDirty();
      if(cloudUser&&teamMember){try{await saveRemoteItem(item);await syncAll(false);}catch(e){console.error(e);markDirty();setCloudError(e?.message||'Pendiente de sincronizar');}}
    };

    dbDelete=async function(id){
      await localDelete(id);addDelete(id);markDirty();
      if(cloudUser&&teamMember){try{await syncAll(false);}catch(e){console.error(e);}}
    };

    dbClear=async function(){
      await localClear();setDeleteQueue([]);markDirty();
      if(cloudUser&&teamMember){try{await deleteAllRemote();clearDirty();localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());setCloudState('synced','Sincronizado · 0');}catch(e){console.error(e);markDirty();setCloudError(e?.message||'Pendiente de sincronizar');}}
    };

    const sf=document.getElementById('settingsForm');if(sf)sf.addEventListener('submit',()=>setTimeout(async()=>{
      if(cloudUser&&teamMember){try{await saveRemoteSettings();setCloudState('synced','Sincronizado');}catch(e){markDirty();setCloudError(e?.message||'No se guardaron los ajustes en la nube.');}}
      else markDirty();
    },0));
    return true;
  }

  function safeToPoll(){
    if(document.visibilityState!=='visible'||syncing||!cloudUser||!teamMember)return false;
    if(document.querySelector('dialog[open]'))return false;
    const active=document.querySelector('.panel.active')?.id;return active!=='new'&&active!=='settings';
  }
  function startAutoSync(){
    setInterval(()=>{if(safeToPoll())syncAll(false);},5000);
    window.addEventListener('focus',()=>{if(safeToPoll())syncAll(false);});
    document.addEventListener('visibilitychange',()=>{if(safeToPoll())syncAll(false);});
  }

  async function initCloud(){
    installHeaderStatus();installCloudUi();
    let tries=0;while((!db||typeof dbGetAll!=='function')&&tries<60){await new Promise(r=>setTimeout(r,100));tries++;}
    if(!wrapStorageFunctions()){cloudReady=false;setCloudError('No se pudo preparar el almacenamiento local.');setCloudState('error','Sin conexión');return;}
    cloudReady=true;await refreshSession();if(cloudUser&&teamMember)await syncAll(false);else renderCloudSession();startAutoSync();
  }

  window.PazSaleCloud={sync:()=>syncAll(true),getUser:()=>cloudUser,getTeam:()=>teamMember,refreshSession};
  initCloud();
})();
