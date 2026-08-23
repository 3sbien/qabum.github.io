const COLLECTION='https://wunderbohnen.de/en/collections/seeds-of-anarchy';
function cleanHtml(h){return h.replace(/\\\//g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&')}
function canonicalImages(h){
 h=cleanHtml(h);
 const raw=[...h.matchAll(/\/cdn\/shop\/files\/[^"'<>\\s?]+\?v=\d+/g)].map(m=>m[0]);
 const seen=new Set(), out=[];
 for(const p of raw){const b=p.split('/').pop().split('?')[0]; if(seen.has(b)) continue; seen.add(b); if(/\.(?:jpe?g|png|webp)$/i.test(b)) out.push('https://wunderbohnen.de'+p)}
 return out;
}
export default async function handler(req,res){
 try{
  const cr=await fetch(COLLECTION,{headers:{'user-agent':'Mozilla/5.0'}}); const ch=await cr.text();
  const products=[...new Set([...ch.matchAll(/href=["']([^"']*\/products\/[^"'?]+)["']/g)].map(m=>new URL(m[1],COLLECTION).href))];
  const out=[];
  for(const p of products){const r=await fetch(p,{headers:{'user-agent':'Mozilla/5.0'}}); const h=await r.text(); out.push({product:p,status:r.status,images:canonicalImages(h).slice(0,15)});}
  res.status(200).json({products:out});
 }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
