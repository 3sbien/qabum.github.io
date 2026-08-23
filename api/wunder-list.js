export default async function handler(req,res){
 try{
  const r=await fetch('https://wunderbohnen.de/products.json?limit=250',{headers:{'user-agent':'Mozilla/5.0','accept':'application/json'}});
  const j=await r.json();
  const products=(j.products||[]).filter(p=>/epstein/i.test([p.title,p.handle,p.body_html].join(' '))).map(p=>({
    id:p.id,title:p.title,handle:p.handle,published_at:p.published_at,
    images:(p.images||[]).map(i=>i.src),featured_image:p.images?.[0]?.src||null
  }));
  const s=await fetch('https://wunderbohnen.de/search/suggest.json?q=Epstein&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=show',{headers:{'user-agent':'Mozilla/5.0','accept':'application/json'}});
  const sj=await s.json().catch(()=>null);
  res.status(200).json({products,suggest:sj});
 }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
