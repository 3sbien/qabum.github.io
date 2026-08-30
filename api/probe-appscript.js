export default async function handler(req,res){
  const urls={
    items:'https://docs.google.com/spreadsheets/d/1n7mj7kmjzNRQzE1a2UhjgGiHbw9FG_RLaQRR8faQKa4/gviz/tq?tqx=out:csv&sheet=ITEMS_GENERADOS',
    locator:'https://docs.google.com/spreadsheets/d/1n7mj7kmjzNRQzE1a2UhjgGiHbw9FG_RLaQRR8faQKa4/gviz/tq?tqx=out:csv&sheet=LOCALIZADOR'
  };
  const out={};
  for(const [k,u] of Object.entries(urls)){
    try{const r=await fetch(u,{redirect:'follow',cache:'no-store'}); const t=await r.text(); out[k]={status:r.status,url:r.url,type:r.headers.get('content-type'),text:t.slice(0,5000)}}catch(e){out[k]={error:String(e)}}
  }
  res.setHeader('Cache-Control','no-store'); res.status(200).json(out);
}
