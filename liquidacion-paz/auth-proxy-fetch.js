/* Route Neon Auth through the Paz's Sale origin so browser session cookies are first-party. */
(function(){
  if(window.__pazAuthProxyInstalled)return;
  window.__pazAuthProxyInstalled=true;
  const AUTH_BASE='https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const raw=typeof input==='string'||input instanceof URL ? String(input) : input?.url;
      if(raw && raw.startsWith(AUTH_BASE)){
        const rest=raw.slice(AUTH_BASE.length).replace(/^\//,'');
        const proxied=new URL('/api/paz-auth/'+rest,location.origin).toString();
        if(input instanceof Request){
          const req=new Request(proxied,input);
          return nativeFetch(req,init);
        }
        return nativeFetch(proxied,init);
      }
    }catch(e){console.warn('Auth proxy rewrite skipped',e);}
    return nativeFetch(input,init);
  };
})();
