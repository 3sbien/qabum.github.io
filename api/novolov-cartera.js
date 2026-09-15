import crypto from 'node:crypto';

function normalizeCode(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();
}

function normalizeQuery(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('593')) digits = `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith('9')) digits = `0${digits}`;
  return digits;
}

function secureEqual(a, b) {
  const ah = crypto.createHash('sha256').update(String(a)).digest();
  const bh = crypto.createHash('sha256').update(String(b)).digest();
  return ah.length === bh.length && crypto.timingSafeEqual(ah, bh);
}

function isAllowed(code) {
  const candidate = normalizeCode(code);
  if (!candidate) return false;

  const configured = [
    process.env.NOVOLOV_CARTERA_CODE_ALEX,
    process.env.NOVOLOV_CARTERA_CODE_CARLOS
  ]
    .map(normalizeCode)
    .filter(Boolean);

  return configured.some(value => secureEqual(candidate, value));
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
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const feedUrl = String(process.env.NOVOLOV_CARTERA_FEED_URL || '').trim();
  const token = String(process.env.NOVOLOV_CARTERA_TOKEN || '').trim();
  const alexCode = String(process.env.NOVOLOV_CARTERA_CODE_ALEX || '').trim();
  const carlosCode = String(process.env.NOVOLOV_CARTERA_CODE_CARLOS || '').trim();

  if (!feedUrl || !token || !alexCode || !carlosCode) {
    return res.status(503).json({ ok: false, error: 'CARTERA_NOT_CONFIGURED' });
  }

  const body = getBody(req);

  if (!isAllowed(body.code)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  const q = normalizeQuery(body.q);
  if (q.length !== 10) {
    return res.status(400).json({ ok: false, error: 'INVALID_QUERY' });
  }

  try {
    const response = await fetch(feedUrl, {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ token, q })
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

    const items = payload.items.map(item => ({
      cedula: String(item.cedula ?? ''),
      nombre: String(item.nombre ?? ''),
      celular: String(item.celular ?? ''),
      totalCreditos: Number(item.totalCreditos ?? 0),
      totalReservas: Number(item.totalReservas ?? 0),
      totalDeudaGenerada: Number(item.totalDeudaGenerada ?? 0),
      totalAbonado: Number(item.totalAbonado ?? 0),
      saldoPendiente: Number(item.saldoPendiente ?? 0),
      estado: String(item.estado ?? ''),
      codigoVendedor: String(item.codigoVendedor ?? ''),
      nombreVendedor: String(item.nombreVendedor ?? ''),
      localOrigen: String(item.localOrigen ?? ''),
      primeraFecha: String(item.primeraFecha ?? ''),
      ultimaFecha: String(item.ultimaFecha ?? ''),
      notas: String(item.notas ?? ''),
      coincidencia: String(item.coincidencia ?? '')
    }));

    return res.status(200).json({
      ok: true,
      found: Boolean(payload.found),
      query: q,
      registros: items.length,
      totalSaldo: Number(payload.totalSaldo ?? 0),
      updatedAt: payload.updatedAt || null,
      items
    });
  } catch {
    return res.status(502).json({ ok: false, error: 'CARTERA_FEED_UNAVAILABLE' });
  }
}
