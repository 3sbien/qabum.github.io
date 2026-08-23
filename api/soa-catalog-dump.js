export default async function handler(req,res){
  try{
    const r=await fetch('https://wunderbohnen.de/products.json?limit=250',{headers:{'user-agent':'Mozilla/5.0','accept':'application/json'}});
    if(!r.ok) return res.status(r.status).json({error:'upstream '+r.status});
    const j=await r.json();
    const products=(j.products||[]).filter(p=>/seeds of anarchy/i.test([p.title,p.vendor,p.body_html,p.handle].join(' '))).map(p=>({title:p.title,handle:p.handle,images:(p.images||[]).map(i=>i.src)}));
    res.status(200).json({count:products.length,products});
  }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
