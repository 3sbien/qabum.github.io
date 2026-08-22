(function(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(el=>el.remove());
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='qabum-logo.svg';document.head.appendChild(icon);
  const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.href='qabum-logo.svg';document.head.appendChild(shortcut);
  document.title="Qabum | Paz's Sale";

  if(!document.querySelector('link[href^="cloud.css"]')){
    const cloudCss=document.createElement('link');cloudCss.rel='stylesheet';cloudCss.href='cloud.css?v=3';document.head.appendChild(cloudCss);
  }

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
      const cloud=document.createElement('script');
      cloud.src='cloud-server.js?v=1';
      cloud.async=false;
      document.body.appendChild(cloud);
    };
    document.body.appendChild(crop);
  };
  document.body.appendChild(core);
})();