const COLLECTION='https://wunderbohnen.de/en/collections/seeds-of-anarchy';
function urls(html){
 const clean=html.replace(/\\\//g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&');
 const paths=[...clean.matchAll(/\/cdn\/shop\/files\/[^"'<>\\s?]+(?:\?[^"'<>\\s]*)?/g)].map(m=>m[0]);
 return [...new Set(paths.map(p=>'https://wunderbohnen.de'+p))];
}
export default async function handler(req,res){
 try{
  const cr=await fetch(COLLECTION,{headers:{'user-agent':'Mozilla/5.0'}}); const ch=await cr.text();
  const products=[...new Set([...ch.matchAll(/href=["']([^"']*\/products\/[^"'?]+)["']/g)].map(m=>new URL(m[1],COLLECTION).href))];
  const out=[];
  for(const p of products){
    const r=await fetch(p,{headers:{'user-agent':'Mozilla/5.0'}}); const h=await r.text();
    const all=urls(h);
    out.push({product:p,status:r.status,images:all.filter(u=>/IMG_|Gunk/i.test(u)),count:all.length});
  }
  res.status(200).json({products:out});
 }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
