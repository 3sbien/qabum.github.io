const COLLECTION='https://wunderbohnen.de/en/collections/seeds-of-anarchy';
function decode(s){return s.replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&')}
function urls(html){const re=/https?:\\?\/\\?\/cdn\.shopify\.com[^"'<>\\s]+/g;return [...new Set((html.match(re)||[]).map(decode).map(x=>x.replace(/\\/g,'')))]}
export default async function handler(req,res){
 try{
  const cr=await fetch(COLLECTION,{headers:{'user-agent':'Mozilla/5.0'}}); const ch=await cr.text();
  const products=[...new Set([...ch.matchAll(/href=["']([^"']*\/products\/[^"'?]+)["']/g)].map(m=>new URL(m[1],COLLECTION).href))];
  const out=[];
  for(const p of products){
    const r=await fetch(p,{headers:{'user-agent':'Mozilla/5.0'}}); const h=await r.text();
    out.push({product:p,status:r.status,images:urls(h).filter(u=>/IMG_|Gunk/i.test(u))});
  }
  res.status(200).json({products:out});
 }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
