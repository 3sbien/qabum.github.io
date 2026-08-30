export default async function handler(req,res){
  const u='https://script.google.com/macros/s/AKfycbxyGrUkXFS2F1tgADSqzfLjNL00BzbcOZKVaWv0ugqIARXTnGE9dV88dVncp-vI_hnh/exec';
  try{
    const r=await fetch(u,{redirect:'follow',cache:'no-store'});
    const t=await r.text();
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({status:r.status,url:r.url,type:r.headers.get('content-type'),text:t.slice(0,200000)});
  }catch(e){res.status(500).json({error:String(e)})}
}
