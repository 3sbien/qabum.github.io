const AUTH_ORIGIN='https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const APP_ORIGIN='https://pazventa.qabum.com';
const RESET_URL=`${APP_ORIGIN}/liquidacion-paz/reset-password/`;

function sameOrigin(req){
  const origin=req.headers?.origin;
  if(!origin)return true;
  try{return new URL(origin).host===String(req.headers?.host||'')}catch{return false}
}
function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, private, max-age=0');
  res.end(JSON.stringify(body));
}
function bodyOf(req){
  if(req.body&&typeof req.body==='object')return req.body;
  if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return{}}}
  return{};
}
async function authPost(endpoint,req,body){
  return fetch(`${AUTH_ORIGIN}/${endpoint}`,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      accept:'application/json',
      origin:APP_ORIGIN,
      referer:`${APP_ORIGIN}/`,
      'user-agent':req.headers?.['user-agent']||'PazSale',
    },
    body:JSON.stringify(body),
    redirect:'manual',
    cache:'no-store',
  });
}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Método no permitido.'});
  if(!sameOrigin(req))return json(res,403,{ok:false,error:'Origen no permitido.'});
  const action=String(req.query?.action||'');
  const body=bodyOf(req);
  try{
    if(action==='request'){
      const email=String(body.email||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{ok:false,error:'Ingresa un email válido.'});
      const r=await authPost('request-password-reset',req,{email,redirectTo:RESET_URL});
      if(!r.ok){
        const text=await r.text().catch(()=> '');
        console.error('Paz Sale password reset request failed',r.status,text.slice(0,300));
      }
      return json(res,200,{ok:true,message:'Si la cuenta existe, recibirás un correo para restablecer la contraseña.'});
    }
    if(action==='reset'){
      const token=String(body.token||'').trim();
      const newPassword=String(body.newPassword||'');
      if(token.length<8)return json(res,400,{ok:false,error:'El enlace de recuperación no es válido o ya expiró.'});
      if(newPassword.length<8||newPassword.length>128)return json(res,400,{ok:false,error:'La contraseña debe tener entre 8 y 128 caracteres.'});
      const r=await authPost('reset-password',req,{token,newPassword});
      const text=await r.text().catch(()=> '');
      if(!r.ok){
        console.error('Paz Sale password reset failed',r.status,text.slice(0,300));
        return json(res,400,{ok:false,error:'No se pudo cambiar la contraseña. El enlace puede haber expirado; solicita uno nuevo.'});
      }
      return json(res,200,{ok:true,message:'Contraseña actualizada correctamente.'});
    }
    return json(res,400,{ok:false,error:'Acción no válida.'});
  }catch(e){
    console.error('Paz Sale password reset error',e);
    return json(res,500,{ok:false,error:'No se pudo completar la recuperación en este momento.'});
  }
}
