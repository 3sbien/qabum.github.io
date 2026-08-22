const SOURCES = {
  '22446': 'seeds-of-anarchy-bullshit.jpg',
  '22447': 'seeds-of-anarchy-bullshit.jpg',
  '22448': 'seeds-of-anarchy-bullshit.jpg',
  '22449': 'seeds-of-anarchy-bullshit.jpg',
  '22450': 'seeds-of-anarchy-cabin-fever.jpg',
  '22451': 'seeds-of-anarchy-dancing-sprite.jpg',
  '22452': 'seeds-of-anarchy-gorgon.jpg',
  '22453': 'seeds-of-anarchy-gunk.jpg',
  '22454': 'seeds-of-anarchy-naughty-dawg.jpg',
  '22455': 'seeds-of-anarchy-naughty-dawg.jpg',
  '22456': 'seeds-of-anarchy-slurpicle-11.jpg',
  '22458': 'seeds-of-anarchy-slurpicle-11.jpg',
  '22459': 'seeds-of-anarchy-spritzade.jpg',
  '22460': 'seeds-of-anarchy-the-epstein-list.jpg'
};

export default async function handler(req, res) {
  const id = String(req.query?.id || '');
  const filename = SOURCES[id];
  if (!filename) return res.status(404).send('Image not found');

  const url = `https://oaseeds.com/${id}-large_default/${filename}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SeedsOfAnarchyCatalog/1.0)',
        'referer': 'https://oaseeds.com/'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream image unavailable');
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(502).send('Invalid upstream response');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('SOA image proxy error', error);
    return res.status(502).send('Image temporarily unavailable');
  }
}
