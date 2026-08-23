const P='https://wunderbohnen.de/en/products/%F0%9F%8C%BF-seeds-of-anarchy-spritzade-feminisierte-photoflower-samen';
export default async function handler(req,res){
 try{
  const r=await fetch(P,{headers:{'user-agent':'Mozilla/5.0'}}); let h=await r.text();
  h=h.replace(/\\\//g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&');
  const paths=[...new Set([...h.matchAll(/\/cdn\/shop\/files\/[^"'<>\\s?]+(?:\?[^"'<>\\s]*)?/g)].map(m=>m[0]))];
  const imgs=paths.filter(x=>/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(x));
  res.status(200).json({status:r.status,count:imgs.length,images:imgs.slice(0,120)});
 }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
