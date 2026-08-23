const SHARE_URL = 'https://1drv.ms/f/c/c8853ab5af2fa8b8/IgC3gfRH9ZTQRbQGAH7IlUHuARfE_dTPpr1ML_4j2XGUKMA?e=Wmj8tZ';
const enc = 'u!' + Buffer.from(SHARE_URL).toString('base64url');

async function probe(name, url, opts={}) {
  try {
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0', 'accept': '*/*' }, ...opts });
    const ct = r.headers.get('content-type') || '';
    let sample = '';
    if (ct.includes('text') || ct.includes('json') || ct.includes('html')) sample = (await r.text()).slice(0,12000);
    return {name,url,status:r.status,location:r.headers.get('location'),contentType:ct,contentLength:r.headers.get('content-length'),sample};
  } catch (e) { return {name,url,error:String(e)}; }
}

export default async function handler(req, res) {
  const urls = [
    ['share-original', SHARE_URL],
    ['share-download', SHARE_URL + '&download=1'],
    ['onedrive-api-root', `https://api.onedrive.com/v1.0/shares/${enc}/root?expand=children`],
    ['onedrive-api-children', `https://api.onedrive.com/v1.0/shares/${enc}/root/children`],
    ['graph-driveitem', `https://graph.microsoft.com/v1.0/shares/${enc}/driveItem`],
    ['graph-root', `https://graph.microsoft.com/v1.0/shares/${enc}/driveItem/children`],
    ['live-download-folder', 'https://onedrive.live.com/download?cid=C8853AB5AF2FA8B8&resid=C8853AB5AF2FA8B8!s47f481b794f545d0b406007ec89541ee']
  ];
  const out=[];
  for (const [name,url] of urls) out.push(await probe(name,url));
  res.status(200).json({enc, probes:out});
}
