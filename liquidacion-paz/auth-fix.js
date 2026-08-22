/* Paz's Sale — robust Neon Auth handoff */
(function(){
  const AUTH_URL='https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
  let authClientPromise=null;
  const getClient=()=>authClientPromise||(authClientPromise=import('https://esm.sh/@neondatabase/neon-js?bundle&target=es2022').then(mod=>mod.createClient({auth:{adapter:mod.BetterAuthVanillaAdapter(),url:AUTH_URL,allowAnonymous:true}})));

  function message(err){return err?.message||err?.error?.message||err?.data?.message||'No se pudo iniciar sesión.';}
  function setState(text,isError=false){
    const box=document.getElementById('cloudStatus');
    if(box){box.className=`cloud-status ${isError?'error':'waiting'}`;box.innerHTML=`<span>Estado</span><strong>${text}</strong>`;}
    const head=document.getElementById('cloudHeaderStatus');
    if(head){head.className=`cloud-header-status ${isError?'error':'waiting'}`;const t=document.getElementById('cloudHeaderText');if(t)t.textContent=text;}
  }
  function setError(text=''){const el=document.getElementById('cloudError');if(el)el.textContent=text;}

  async function handleAuth(button){
    const create=button.id==='cloudSignUp';
    const email=document.getElementById('cloudEmail')?.value.trim()||'';
    const password=document.getElementById('cloudPassword')?.value||'';
    const name=document.getElementById('cloudName')?.value.trim()||'Usuario';
    if(!email||password.length<8){setError('Ingresa un email válido y una contraseña de al menos 8 caracteres.');return;}
    const signIn=document.getElementById('cloudSignIn'),signUp=document.getElementById('cloudSignUp');
    if(signIn)signIn.disabled=true;if(signUp)signUp.disabled=true;
    setError('');setState(create?'Creando cuenta…':'Entrando…');
    try{
      const client=await getClient();
      const r=create?await client.auth.signUp.email({email,password,name}):await client.auth.signIn.email({email,password,rememberMe:true});
      if(r?.error)throw r.error;
      setState('Acceso correcto');
      setTimeout(()=>location.reload(),450);
    }catch(e){
      console.error('Auth handoff error',e);setError(message(e));setState('Error de acceso',true);
      if(signIn)signIn.disabled=false;if(signUp)signUp.disabled=false;
    }
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('#cloudSignIn,#cloudSignUp');
    if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();
    handleAuth(button);
  },true);
})();
