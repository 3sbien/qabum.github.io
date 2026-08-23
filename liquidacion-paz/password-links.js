/* Paz's Sale — self-service password recovery links. Isolated UI layer. */
(function(){
  const RESET_PATH='/liquidacion-paz/reset-password/';

  function resetUrl(email=''){
    const value=String(email||'').trim().toLowerCase();
    return value?`${RESET_PATH}?email=${encodeURIComponent(value)}`:RESET_PATH;
  }

  function install(){
    const guest=document.getElementById('cloudGuest');
    const logged=document.getElementById('cloudLogged');
    if(!guest||!logged)return false;

    if(!document.getElementById('cloudForgotPassword')){
      const form=document.getElementById('cloudLoginForm');
      if(form){
        const row=document.createElement('div');
        row.style.marginTop='10px';
        row.style.textAlign='center';
        const link=document.createElement('a');
        link.id='cloudForgotPassword';
        link.href=RESET_PATH;
        link.textContent='¿Olvidaste tu contraseña?';
        link.style.fontWeight='800';
        link.style.color='#012169';
        link.addEventListener('click',()=>{
          const email=document.getElementById('cloudEmail')?.value||'';
          link.href=resetUrl(email);
        });
        row.appendChild(link);
        form.appendChild(row);
      }
    }

    if(!document.getElementById('cloudChangePassword')){
      const actions=logged.querySelector('.cloud-actions');
      if(actions){
        const link=document.createElement('a');
        link.id='cloudChangePassword';
        link.className='btn ghost';
        link.href=RESET_PATH;
        link.textContent='Cambiar contraseña';
        link.addEventListener('click',()=>{
          const email=window.PazSaleCloud?.getUser?.()?.email||'';
          link.href=resetUrl(email);
        });
        actions.insertBefore(link,actions.lastElementChild||null);
      }
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>100)clearInterval(timer);
  },100);
})();
