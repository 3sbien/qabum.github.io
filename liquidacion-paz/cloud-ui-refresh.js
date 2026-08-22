/* Keep the visible Paz's Sale UI aligned with the shared Neon inventory. */
(function(){
  if(window.__pazCloudUiRefreshInstalled)return;
  window.__pazCloudUiRefreshInstalled=true;

  let busy=false;
  let timer=null;

  function authenticated(){
    try{return !!(window.PazSaleCloud?.getUser?.() && window.PazSaleCloud?.getTeam?.());}
    catch{return false;}
  }

  function safeToRefresh(){
    if(document.hidden)return false;
    const active=document.querySelector('.panel.active')?.id||'';
    if(active==='new'||active==='settings')return false;
    if(document.querySelector('dialog[open]'))return false;
    return true;
  }

  async function refreshSharedUi(){
    if(busy || !authenticated() || !safeToRefresh() || typeof refresh!=='function')return;
    busy=true;
    try{await refresh();}
    catch(e){console.warn('Shared UI refresh skipped',e);}
    finally{busy=false;}
  }

  function schedule(delay=100){
    clearTimeout(timer);
    timer=setTimeout(refreshSharedUi,delay);
  }

  function inspectSyncState(){
    const text=document.getElementById('cloudHeaderText')?.textContent||'';
    if(text.startsWith('Sincronizado')) schedule();
  }

  const observer=new MutationObserver(inspectSyncState);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});

  window.addEventListener('focus',()=>schedule(100));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(100);});

  // Cross-device live refresh: visible shared-data screens update automatically.
  setInterval(()=>schedule(0),5000);
  setTimeout(inspectSyncState,400);
})();
