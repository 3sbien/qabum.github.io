(function(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(el=>el.remove());
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='qabum-logo.svg';document.head.appendChild(icon);
  const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.href='qabum-logo.svg';document.head.appendChild(shortcut);
  document.title="Qabum | Paz's Sale";

  const core=document.createElement('script');
  core.src='brand-core.js?v=2';
  core.async=false;
  core.onload=()=>{
    const crop=document.createElement('script');
    crop.src='crop.js?v=2';
    crop.async=false;
    document.body.appendChild(crop);
  };
  document.body.appendChild(core);
})();
