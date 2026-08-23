export default async function handler(req,res){
 try{
  const urls=[
   'https://wunderbohnen.de/products.json?limit=250',
   'https://wunderbohnen.de/search/suggest.json?q=Epstein&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=show'
  ];
  const out=[];
  for(const u of urls){const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0','accept':'application/json'}}); const t=await r.text(); out.push({url:u,status:r.status,body:t.slice(0,500000)});}
  res.status(200).json({out});
 }catch(e){res.status(500).json({error:String(e&&e.stack||e)})}
}
