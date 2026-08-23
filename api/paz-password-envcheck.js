import crypto from 'node:crypto';

const AUTH_ORIGIN='https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const APP_ORIGIN='https://pazventa.qabum.com';
const RESET_URL=`${APP_ORIGIN}/liquidacion-paz/reset-password/`;

async function post(path,body){
  const r=await fetch(`${AUTH_ORIGIN}/${path}`,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      accept:'application/json',
      origin:APP_ORIGIN,
      referer:`${APP_ORIGIN}/`,
      'user-agent':'PazSaleResetProbe/1.0'
    },
    body:JSON.stringify(body),
    redirect:'manual',
    cache:'no-store'
  });
  const text=await r.text().catch(()=> '');
  let data=null;try{data=text?JSON.parse(text):null}catch{data={raw:text.slice(0,300)}}
  return {status:r.status,ok:r.ok,data};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false});
  const action=String(req.query?.action||'');
  try{
    if(action==='create'){
      const email=`3sbien+pazreset-${Date.now()}@gmail.com`;
      const password=crypto.randomBytes(32).toString('base64url');
      const signup=await post('sign-up/email',{email,password,name:'Paz Reset Probe'});
      if(!signup.ok)return res.status(500).json({ok:false,stage:'signup',status:signup.status});
      const request=await post('request-password-reset',{email,redirectTo:RESET_URL});
      return res.status(request.ok?200:500).json({ok:request.ok,email,stage:'requested',status:request.status});
    }
    if(action==='reset'){
      const token=String(req.query?.token||'').trim();
      const email=String(req.query?.email||'').trim().toLowerCase();
      if(!token||!email.startsWith('3sbien+pazreset-')||!email.endsWith('@gmail.com'))return res.status(400).json({ok:false,stage:'input'});
      const newPassword=crypto.randomBytes(32).toString('base64url');
      const reset=await post(`reset-password?token=${encodeURIComponent(token)}`,{newPassword});
      if(!reset.ok)return res.status(200).json({ok:false,stage:'reset',resetStatus:reset.status,resetCode:reset.data?.code||null,resetMessage:reset.data?.message||null});
      const signin=await post('sign-in/email',{email,password:newPassword,rememberMe:false});
      return res.status(200).json({ok:signin.ok,stage:'verified',resetStatus:reset.status,signInStatus:signin.status});
    }
    return res.status(400).json({ok:false,stage:'action'});
  }catch(e){
    console.error('Paz reset probe error',e);
    return res.status(500).json({ok:false,stage:'exception'});
  }
}
