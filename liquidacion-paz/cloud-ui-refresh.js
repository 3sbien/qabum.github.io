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

  async function refreshSharedUi(){
    if(busy || !authenticated() || typeof refresh!=='function')return;
    busy=true;
    try{await refresh();}
    catch(e){console.warn('Shared UI refresh skipped',e);}
    finally{busy=false;}
  }

  function schedule(delay=120){
    clearTimeout(timer);
    timer=setTimeout(refreshSharedUi,delay);
  }

  function inspectSyncState(){
    const text=document.getElementById('cloudHeaderText')?.textContent||'';
    if(text.startsWith('Sincronizado')) schedule();
  }

  const observer=new MutationObserver(inspectSyncState);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});

  window.addEventListener('focus',()=>schedule(150));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(150);});

  // Lightweight polling so changes made by another administrator appear without a manual reload.
  setInterval(()=>{if(!document.hidden)schedule(0);},20000);
  setTimeout(inspectSyncState,500);
})();
