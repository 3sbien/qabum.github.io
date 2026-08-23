const SHARE_URL = 'https://1drv.ms/f/c/c8853ab5af2fa8b8/IgC3gfRH9ZTQRbQGAH7IlUHuARfE_dTPpr1ML_4j2XGUKMA?e=Wmj8tZ';

export default async function handler(req, res) {
  try {
    const r = await fetch(SHARE_URL, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
    const text = await r.text();
    res.status(200).json({
      status: r.status,
      finalUrl: r.url,
      contentType: r.headers.get('content-type'),
      length: text.length,
      body: text.slice(0, 600000)
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.stack || e) });
  }
}
