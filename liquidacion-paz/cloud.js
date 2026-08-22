/* Paz's Sale — Neon Auth + public catalog synchronization */
(function(){
  const AUTH_URL='https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
  const DATA_URL='https://ep-silent-credit-awhuo8p7.apirest.c-12.us-east-1.aws.neon.tech/neondb/rest/v1';
  const CATALOG_URL='./catalogo/';
  let neonClient=null;
  let cloudUser=null;
  let cloudReady=false;
  let syncing=false;

  function addCloudStyles(){
    if(document.querySelector('link[href="cloud.css?v=1"]')) return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='cloud.css?v=1';document.head.appendChild(l);
  }

  function installCloudUi(){
    const settings=document.getElementById('settings');
    if(!settings || document.getElementById('cloudCard')) return;
    const card=document.createElement('div');
    card.id='cloudCard';card.className='cloud-card';
    card.innerHTML=`
      <h3>Cuenta y catálogo en vivo</h3>
      <p>Inicia sesión para sincronizar automáticamente al catálogo público. Solo se publican foto, descripción, categoría, estado y precio publicado.</p>
      <div id="cloudStatus" class="cloud-status"><span>Estado</span><strong>Conectando…</strong></div>
      <div id="cloudGuest">
        <div class="cloud-grid">
          <div class="field cloud-full"><label for="cloudName">Nombre</label><input id="cloudName" maxlength="80" placeholder="María Paz"></div>
          <div class="field"><label for="cloudEmail">Email</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="correo@ejemplo.com"></div>
          <div class="field"><label for="cloudPassword">Contraseña</label><input id="cloudPassword" type="password" minlength="8" autocomplete="current-password" placeholder="Mínimo 8 caracteres"></div>
        </div>
        <div class="cloud-actions"><button type="button" id="cloudSignIn" class="btn dark">Entrar</button><button type="button" id="cloudSignUp" class="btn ghost">Crear cuenta</button></div>
      </div>
      <div id="cloudLogged" class="cloud-hidden">
        <p>Sesión: <strong id="cloudUserLabel"></strong></p>
        <div class="cloud-actions"><button type="button" id="cloudSync" class="btn dark">Sincronizar ahora</button><a id="cloudCatalogLink" class="btn ghost" href="${CATALOG_URL}" target="_blank" rel="noopener">Abrir catálogo en vivo</a><button type="button" id="cloudSignOut" class="btn ghost">Salir</button></div>
      </div>
      <div id="cloudError" class="cloud-error"></div>
      <p class="cloud-note">Los precios mínimo, máximo y de venta rápida, compradores, pagos y saldos nunca se envían a la tabla pública.</p>`;
    settings.appendChild(card);
    document.getElementById('cloudSignIn').addEventListener('click',()=>cloudLogin(false));
    document.getElementById('cloudSignUp').addEventListener('click',()=>cloudLogin(true));
    document.getElementById('cloudSignOut').addEventListener('click',cloudLogout);
    document.getElementById('cloudSync').addEventListener('click',()=>syncAll(true));
  }

  function setCloudStatus(text,ok=false){
    const el=document.getElementById('cloudStatus');if(!el)return;
    el.innerHTML=`<span>Estado</span><strong>${text}</strong>`;
    el.style.borderColor=ok?'rgba(1,33,105,.25)':'rgba(200,16,46,.25)';
  }
  function setCloudError(text=''){const el=document.getElementById('cloudError');if(el)el.textContent=text;}
  function normalizeSession(result){
    const root=result?.data ?? result ?? null;
    if(root?.user) return {user:root.user,session:root.session};
    if(root?.session?.user) return {user:root.session.user,session:root.session};
    return null;
  }
  async function refreshSession(){
    if(!neonClient) return null;
    try{
      const r=await neonClient.auth.getSession();
      const s=normalizeSession(r);cloudUser=s?.user||null;
    }catch(e){cloudUser=null;}
    renderCloudSession();return cloudUser;
  }
  function renderCloudSession(){
    const guest=document.getElementById('cloudGuest'),logged=document.getElementById('cloudLogged');
    if(!guest||!logged)return;
    if(cloudUser){
      guest.classList.add('cloud-hidden');logged.classList.remove('cloud-hidden');
      document.getElementById('cloudUserLabel').textContent=cloudUser.email||cloudUser.name||'Cuenta activa';
      setCloudStatus('Sincronización activa',true);
    }else{
      guest.classList.remove('cloud-hidden');logged.classList.add('cloud-hidden');
      setCloudStatus(cloudReady?'Sin sesión':'Conectando…',cloudReady);
    }
  }
  function authMessage(err){return err?.message||err?.error?.message||err?.data?.message||String(err||'No se pudo completar la operación');}

  async function cloudLogin(create){
    setCloudError('');
    if(!neonClient) return setCloudError('La conexión todavía está cargando.');
    const email=document.getElementById('cloudEmail').value.trim();
    const password=document.getElementById('cloudPassword').value;
    const name=document.getElementById('cloudName').value.trim()||'María Paz';
    if(!email||password.length<8) return setCloudError('Ingresa un email válido y una contraseña de al menos 8 caracteres.');
    try{
      setCloudStatus(create?'Creando cuenta…':'Entrando…');
      const r=create ? await neonClient.auth.signUp.email({email,password,name}) : await neonClient.auth.signIn.email({email,password,rememberMe:true});
      if(r?.error) throw r.error;
      await refreshSession();
      if(!cloudUser) throw new Error('La sesión no quedó activa. Intenta entrar nuevamente.');
      await syncAll(true);
    }catch(e){console.error(e);setCloudError(authMessage(e));setCloudStatus('Error de acceso');}
  }

  async function cloudLogout(){
    try{await neonClient.auth.signOut();}catch(e){console.warn(e);}cloudUser=null;renderCloudSession();setCloudError('');
  }

  function canvasImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
  async function publicPhoto(src){
    if(!src) return null;
    try{
      const im=await canvasImage(src);const max=1100;const scale=Math.min(1,max/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.72);
    }catch(e){console.warn('Public photo conversion failed',e);return src;}
  }

  async function publicPayload(item){
    const photo=await publicPhoto(item.photos?.[0]);
    return {id:item.id,title:item.title||'',description:item.description||'',category:item.category||'',status:item.status||'DISPONIBLE',asking_price:Number(item.askingPrice||0),photos:photo?[photo]:[],updated_at:new Date().toISOString()};
  }

  async function syncSettings(){
    if(!cloudUser||!neonClient) return;
    const s=getSettings();
    const payload={owner_user_id:cloudUser.id,catalog_title:s.catalogTitle||"Paz's Sale",contact_name:s.contactName||'',contact_phone:s.contactPhone||'',location_text:s.locationText||'',updated_at:new Date().toISOString()};
    const {error}=await neonClient.from('paz_sale_public_settings').upsert(payload,{onConflict:'owner_user_id'});
    if(error) throw error;
  }

  async function syncItem(item){
    if(!cloudUser||!neonClient||!item) return;
    const payload=await publicPayload(item);
    const {error}=await neonClient.from('paz_sale_public_items').upsert(payload,{onConflict:'id'});
    if(error) throw error;
  }

  async function deleteCloudItem(id){
    if(!cloudUser||!neonClient||!id) return;
    const {error}=await neonClient.from('paz_sale_public_items').delete().eq('id',id).eq('owner_user_id',cloudUser.id);
    if(error) throw error;
  }

  async function syncAll(showMessage=false){
    if(syncing) return;
    if(!cloudUser||!neonClient){if(showMessage)setCloudError('Primero inicia sesión.');return;}
    syncing=true;setCloudError('');setCloudStatus('Sincronizando…');
    try{
      const local=await dbGetAll();
      for(const item of local) await syncItem(item);
      await syncSettings();
      const {data:remote,error}=await neonClient.from('paz_sale_public_items').select('id,owner_user_id').eq('owner_user_id',cloudUser.id);
      if(error) throw error;
      const keep=new Set(local.map(i=>i.id));
      for(const r of (remote||[])) if(!keep.has(r.id)) await deleteCloudItem(r.id);
      setCloudStatus(`Sincronizado · ${local.length} artículo${local.length===1?'':'s'}`,true);
      if(showMessage) toast('Catálogo en vivo actualizado');
    }catch(e){console.error(e);setCloudError(authMessage(e));setCloudStatus('Error de sincronización');}
    finally{syncing=false;}
  }

  function wrapLocalWrites(){
    if(window.__pazCloudWrapped) return;window.__pazCloudWrapped=true;
    const localPut=dbPut;
    dbPut=async function(item){const r=await localPut(item);if(cloudUser)syncItem(item).catch(e=>{console.error(e);setCloudStatus('Pendiente de sincronizar')});return r;};
    const localDelete=dbDelete;
    dbDelete=async function(id){const r=await localDelete(id);if(cloudUser)deleteCloudItem(id).catch(e=>console.error(e));return r;};
    const sf=document.getElementById('settingsForm');
    if(sf) sf.addEventListener('submit',()=>{setTimeout(()=>syncSettings().catch(e=>{console.error(e);setCloudStatus('Pendiente de sincronizar')}),0);});
  }

  async function initCloud(){
    addCloudStyles();installCloudUi();
    try{
      const mod=await import('https://esm.sh/@neondatabase/neon-js?bundle&target=es2022');
      neonClient=mod.createClient({
        auth:{adapter:mod.BetterAuthVanillaAdapter(),url:AUTH_URL,allowAnonymous:true},
        dataApi:{url:DATA_URL}
      });
      cloudReady=true;wrapLocalWrites();await refreshSession();
      if(cloudUser) await syncAll(false);
    }catch(e){console.error('Neon init failed',e);cloudReady=false;setCloudError('No se pudo conectar al catálogo en vivo. Revisa Internet y vuelve a cargar.');setCloudStatus('Sin conexión');}
  }

  initCloud();
})();
