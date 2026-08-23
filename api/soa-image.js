const SOURCES = {
  b1:'https://wunderbohnen.de/cdn/shop/files/1_11d9af36-02fc-4300-8f3d-2fef29176958.jpg?v=1766057814',
  b2:'https://wunderbohnen.de/cdn/shop/files/2_dc61888e-075c-4c07-beab-a5f76810e7ba.jpg?v=1766057814',
  b3:'https://wunderbohnen.de/cdn/shop/files/4_087e6874-1db6-4332-95c7-b2d7961be438.jpg?v=1766057814',
  b4:'https://wunderbohnen.de/cdn/shop/files/5_ba752605-8cf0-4626-9bde-0ed7f7041e6c.jpg?v=1766057814',
  b5:'https://wunderbohnen.de/cdn/shop/files/7_3320856b-e01e-4ee4-9703-e43e06117ce2.jpg?v=1766057814',
  b6:'https://wunderbohnen.de/cdn/shop/files/8_a7d6078d-0223-460a-a2d9-923ba548ac45.jpg?v=1766057814',
  c1:'https://wunderbohnen.de/cdn/shop/files/1_f56dc67a-e428-4495-87c0-1bf366b81328.jpg?v=1766057387',
  c2:'https://wunderbohnen.de/cdn/shop/files/2_97e2d81f-ca05-4cf3-865f-d0f942a93ff6.jpg?v=1766057387',
  c3:'https://wunderbohnen.de/cdn/shop/files/3_8f5a7e29-3a60-4184-b78b-3b2c31bffec0.jpg?v=1766057387',
  c4:'https://wunderbohnen.de/cdn/shop/files/4_948f6dd8-9ccf-4ff6-9623-c0b1b714b2a0.jpg?v=1766057387',
  c5:'https://wunderbohnen.de/cdn/shop/files/5_b2d46003-bc80-4aad-9a6e-45a2c5e54c14.jpg?v=1766057387',
  d1:'https://wunderbohnen.de/cdn/shop/files/1_04d6f025-82f4-4fee-aa93-0a6fa4f517d5.jpg?v=1766056799',
  d2:'https://wunderbohnen.de/cdn/shop/files/2_58fac6f5-9ec0-48a6-a8ef-9b8ed1ff4c60.jpg?v=1766056797',
  d3:'https://wunderbohnen.de/cdn/shop/files/3_c65afe63-f4ab-4498-a68d-d4c6a73eb725.jpg?v=1766056799',
  d4:'https://wunderbohnen.de/cdn/shop/files/4_e623cd58-9246-4a36-81b3-0d566457cada.jpg?v=1766056799',
  d5:'https://wunderbohnen.de/cdn/shop/files/5_fabe70ea-8a79-4111-aef5-acd6e022c040.jpg?v=1766056799',
  go1:'https://wunderbohnen.de/cdn/shop/files/1_ce9e47f4-9fb7-41b9-bf11-b08ac866b95d.jpg?v=1766056406',
  go2:'https://wunderbohnen.de/cdn/shop/files/2_b44fab5f-c3a2-441b-8e0c-be813d6fa286.jpg?v=1766056406',
  go3:'https://wunderbohnen.de/cdn/shop/files/3_b9b8750a-521d-4abf-955b-4729e3a796bd.jpg?v=1766056406',
  go4:'https://wunderbohnen.de/cdn/shop/files/4_6ae2df4d-a8bf-4e5f-8166-61e3ce006824.jpg?v=1766056406',
  go5:'https://wunderbohnen.de/cdn/shop/files/5_f3a3f456-429c-4974-b164-8a863bce41c5.jpg?v=1766056406',
  gu1:'https://wunderbohnen.de/cdn/shop/files/1.jpg?v=1765983612',
  gu2:'https://wunderbohnen.de/cdn/shop/files/2.jpg?v=1765983612',
  n1:'https://wunderbohnen.de/cdn/shop/files/1_4f16fabd-7667-4a2d-b255-0b8b9df16ef0.jpg?v=1765983941',
  n2:'https://wunderbohnen.de/cdn/shop/files/2_bd94ec61-06c8-40cf-ad58-37f4dc01338f.jpg?v=1765983941',
  n3:'https://wunderbohnen.de/cdn/shop/files/3_967e6a30-c911-4889-a566-b199335e8e65.jpg?v=1765983941',
  n4:'https://wunderbohnen.de/cdn/shop/files/4_723717cc-23b7-4278-8690-e625fd76e865.jpg?v=1765983941',
  n5:'https://wunderbohnen.de/cdn/shop/files/5_93041fa7-c7a5-4216-a61b-c7a2a435481a.jpg?v=1765983941',
  n6:'https://wunderbohnen.de/cdn/shop/files/6_85486fde-d834-4e5c-b63f-aff8cebb2985.jpg?v=1765983941',
  s1:'https://wunderbohnen.de/cdn/shop/files/1_03860de5-34ef-44c7-a419-7fe8cb0a55a1.jpg?v=1765981895',
  s2:'https://wunderbohnen.de/cdn/shop/files/2_5640f720-8562-4314-a5e7-983a6aa5df47.jpg?v=1765981894',
  s3:'https://wunderbohnen.de/cdn/shop/files/3.jpg?v=1765981894',
  s4:'https://wunderbohnen.de/cdn/shop/files/4_15f642ec-efd5-4be0-a09c-c4249b4521be.jpg?v=1765981894',
  s5:'https://wunderbohnen.de/cdn/shop/files/5_fed9c6b5-5370-46e7-9202-2466cf50fb1c.jpg?v=1765981894',
  s6:'https://wunderbohnen.de/cdn/shop/files/6_3041e263-dc6a-48f7-8259-26a96bb49849.jpg?v=1765981893',
  sp1:'https://wunderbohnen.de/cdn/shop/files/1_dfd252d4-498e-4bfe-a9b6-075b0080a034.jpg?v=1765976188',
  sp2:'https://wunderbohnen.de/cdn/shop/files/2_22cce141-0c18-425b-b63d-f262e3913bab.jpg?v=1765976187',
  sp3:'https://wunderbohnen.de/cdn/shop/files/3_f613b15d-d09a-4772-9c32-615e9f1c9012.jpg?v=1765976188',
  sp4:'https://wunderbohnen.de/cdn/shop/files/4_b1196252-5df8-4030-98bc-5f751544a1cc.jpg?v=1765976188',
  sp5:'https://wunderbohnen.de/cdn/shop/files/5_72223615-06c2-4ef2-acf3-b4c526226871.jpg?v=1765976187',
  sp6:'https://wunderbohnen.de/cdn/shop/files/6.jpg?v=1765976189'
};

export default async function handler(req, res) {
  const id = String(req.query?.id || '');
  const url = SOURCES[id];
  if (!url) return res.status(404).send('Image not found');
  try {
    const upstream = await fetch(url, {headers:{
      'user-agent':'Mozilla/5.0 (compatible; SeedsOfAnarchyCatalog/1.0)',
      'referer':'https://wunderbohnen.de/'
    }});
    if (!upstream.ok) return res.status(upstream.status).send('Upstream image unavailable');
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return res.status(502).send('Invalid upstream response');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('SOA image proxy error', error);
    return res.status(502).send('Image temporarily unavailable');
  }
}
