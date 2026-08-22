(function(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(el=>el.remove());
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='qabum-logo.svg';document.head.appendChild(icon);
  const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.href='qabum-logo.svg';document.head.appendChild(shortcut);
  document.title="Qabum | Paz's Sale";

  const cropFix=document.createElement('style');
  cropFix.textContent='.photo-preview .photo-edit-btn{position:static!important;top:auto!important;right:auto!important;width:auto!important;height:auto!important;line-height:1.2!important;border:1px solid rgba(1,33,105,.25)!important;background:#fff!important;color:#012169!important;border-radius:999px!important;padding:6px 10px!important;font-size:11px!important;font-weight:800!important;display:inline-block!important}.thumb-wrap{position:relative!important}';
  document.head.appendChild(cropFix);

  const core=document.createElement('script');
  core.src='brand-core.js?v=2';
  core.async=false;
  core.onload=()=>{
    const crop=document.createElement('script');
    crop.src='crop.js?v=3';
    crop.async=false;
    crop.onload=()=>{
      const authProxy=document.createElement('script');
      authProxy.src='auth-proxy-fetch.js?v=1';
      authProxy.async=false;
      authProxy.onload=()=>{
        const cloud=document.createElement('script');
        cloud.src='cloud.js?v=2';
        cloud.async=false;
        cloud.onload=()=>{
          let tries=0;
          const kick=()=>{
            tries++;
            if(window.PazSaleCloud && typeof db!=='undefined' && db){window.PazSaleCloud.sync();return;}
            if(tries<40)setTimeout(kick,250);
          };
          kick();
        };
        document.body.appendChild(cloud);
      };
      document.body.appendChild(authProxy);
    };
    document.body.appendChild(crop);
  };
  document.body.appendChild(core);
})();