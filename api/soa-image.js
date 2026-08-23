const SOURCES = {
  b1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1.jpg?v=1766057486',
  b2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/2.jpg?v=1766057486',
  b3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/5.jpg?v=1766057486',
  b4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/4.jpg?v=1766057486',
  b5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Bullshit__6.jpg?v=1766057486',
  b6:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/3.jpg?v=1766057486',
  c1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1_ed7f1ef7-d44c-499f-88db-d5a8efec745b.jpg?v=1766058827',
  c2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/2_f0779e76-298b-4e92-b628-2ee1da09ab72.jpg?v=1766058827',
  c3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Cabin_Fever_3.jpg?v=1766058827',
  c4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_5e24d799-f48a-4c53-84c4-64298d63e050.jpg?v=1766058827',
  c5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_8c9eb428-263a-4d55-865b-e10ddf18684f.jpg?v=1766058827',
  d1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1_e0c2a0fe-d280-49e5-97f6-4e4f847e6a33.jpg?v=1766058718',
  d2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/2_af31f934-a46c-4a86-b5dc-b936e0878e6e.jpg?v=1766058718',
  d3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/3_12fdfc5e-8577-486d-aaff-bdda46c0c310.jpg?v=1766058718',
  d4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Dancing_Sprite_2.jpg?v=1766058738',
  d5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_37ad39a2-6437-4ad5-92ee-501908f7e0f6.jpg?v=1766058738',
  go1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/2_a862791f-0dc2-413e-98c5-3ba104935a57.jpg?v=1766058605',
  go2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1_a5c49b61-cc65-4043-b32f-79dc393216d6.jpg?v=1766058605',
  go3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Gorgon__3.jpg?v=1766058605',
  go4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_3db95f14-a711-4afd-a866-738bfc6f248f.jpg?v=1766058605',
  go5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_8ac93a81-cc94-4630-b1a4-bbbf0da59e9a.jpg?v=1766058605',
  gu1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_6162698d-df47-4b84-9031-da00dc658212.jpg?v=1766936568',
  gu2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_7d024d34-f5a1-4e6d-9fcd-b64b142ba023.jpg?v=1766936568',
  n1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/2_80d2ac1b-ad79-477b-81db-7f50d8c5660c.jpg?v=1766058504',
  n2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/3_983c2582-2ea6-4072-b43b-c55036ec6ded.jpg?v=1766058504',
  n3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Naughty_Dawg_7.jpg?v=1766058504',
  n4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Naughty_Dawg_6.jpg?v=1766058504',
  n5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1_95d5d561-78d6-43d3-9eb5-19f36fbbbd03.jpg?v=1766058504',
  n6:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Naughty_Dawg.jpg?v=1766058504',
  s1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/3_5c759cde-2638-4b10-a9df-bd93859a52bb.jpg?v=1766058385',
  s2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1_c9209ba5-7cde-4e69-9add-c45a1cd0b397.jpg?v=1766058385',
  s3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Slurpicle__3.jpg?v=1766058385',
  s4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/2_4556e2bd-8a3c-4819-a3f9-a37c8b8893f4.jpg?v=1766058385',
  s5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Slurpicle__4.jpg?v=1766058385',
  s6:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_d83e4b9c-e346-4b73-87ab-44d40393d60a.jpg?v=1766058385',
  sp1:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/3rdPlaceLivingSoilCupMaryJane2026.png?v=1786626989',
  sp2:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/1_dfd32d95-555c-4f91-ae2b-9996303332b8.jpg?v=1766058211',
  sp3:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/3_9e0cc282-e715-47a0-9818-b8e763d06035.jpg?v=1766058211',
  sp4:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/Spritzade__5.jpg?v=1766058211',
  sp5:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/rn-image_picker_lib_temp_d8d79013-673b-4839-beb1-629452d33e2d.jpg?v=1766058211',
  sp6:'https://cdn.shopify.com/s/files/1/0913/8841/2281/files/4_7c1bd9dc-ec23-4e52-921f-463c5b320554.jpg?v=1766058211'
};

export default async function handler(req, res) {
  const id = String(req.query?.id || '');
  const url = SOURCES[id];
  if (!url) return res.status(404).send('Image not found');
  try {
    const upstream = await fetch(url, {headers:{
      'user-agent':'Mozilla/5.0 (compatible; SeedsOfAnarchyCatalog/1.0)',
      'accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
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
