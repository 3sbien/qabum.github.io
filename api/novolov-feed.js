import crypto from 'node:crypto';

const ALLOWED = new Set([
  '211cd3f03b5104a8549e2a3431308db7df462d194cf05865f706004b1335ca53',
  '0a789ffeef13b1dfce35a672ef7a3a95a91671da756605104ac8b35f381dedd6',
  '411fafb5a9f5b889367156db16f1a2c4e659baab871a93e0cd73627cad2c948d',
  '0b4702b337c2d6827e10b64c43fb0219fd64a004a098da874a0b2faf1a5d405c',
  '2bb433f11f564709d7a8aa0d9676d8eba5004b687912122928103a9ab99d9106',
  '0a26ced5cd75a67c1f45c75241fa894b0fa20da323c62ad038a40394b9ceb49e',
  'caece47edc2056c288c6f508ef10a30071322d9be25d40512c3f518eb346cc07',
  'c9eee10c2532cd828bbecdf67949ce457b075bb795da2851d98404eb40763500',
  '910dca5dde34f1c4ede9a375bbbd4a4487df2626fb70081b7ffd9185bad0f4c2',
  '4a391ffa9b4a61b46ecf8e448510b7b602a3412f9091e1abe9622f005deb3862',
  '0e60bd675dfd3bf1b002ca0b4306a3a55b6718b8161bfb4075a781491a9bd0a9',
  '45e6ba7659150d7ed6b8c49e066fd480bc056aafacdc9a9e3603ead48776ed2c',
  'b0606f74baf81d1ba56e3cd34faf2eea650dffa026ef8507c2dc55ce27bc6c8f',
  '3a6214cc014209949eeb59553587868139cd4a8182693b694f2f75af2ea9cd67',
  '87152bb2d42a155afd45bb4c10d12e86d006808518aaf38ad07053d30283b1fe'
]);

function normalizeCode(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();
}

function isAllowed(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return false;
  const hash = crypto.createHash('sha256').update(`novolov:${normalized}`).digest('hex');
  return ALLOWED.has(hash);
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const feedUrl = process.env.NOVOLOV_WEB_FEED_URL;
  const token = process.env.NOVOLOV_WEB_FEED_TOKEN;

  if (!feedUrl || !token) {
    return res.status(503).json({ ok: false, error: 'LIVE_FEED_NOT_CONFIGURED' });
  }

  const health = req.method === 'GET' && String(req.query?.health || '') === '1';

  if (!health) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }
    const body = getBody(req);
    if (!isAllowed(body.code)) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }
  }

  try {
    const upstream = new URL(feedUrl);
    upstream.searchParams.set('token', token);
    upstream.searchParams.set('_ts', String(Date.now()));

    const response = await fetch(upstream, {
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return res.status(502).json({ ok: false, error: 'INVALID_UPSTREAM_RESPONSE' });
    }

    if (!response.ok || !payload?.ok || !Array.isArray(payload.items)) {
      return res.status(502).json({ ok: false, error: 'UPSTREAM_ERROR' });
    }

    if (health) {
      return res.status(200).json({ ok: true, source: 'WEB_FEED_LIVE' });
    }

    const items = payload.items.map(item => ({
      codigo: String(item.codigo ?? ''),
      barras: String(item.barras ?? ''),
      prenda: String(item.prenda ?? ''),
      pvp: String(item.pvp ?? ''),
      ubicacion: String(item.ubicacion ?? ''),
      marca: String(item.marca ?? ''),
      talla: String(item.talla ?? ''),
      color: String(item.color ?? ''),
      estado: String(item.estado ?? '')
    }));

    return res.status(200).json({
      ok: true,
      source: 'WEB_FEED_LIVE',
      updatedAt: payload.updatedAt || null,
      items
    });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'LIVE_FEED_UNAVAILABLE' });
  }
}
