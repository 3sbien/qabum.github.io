const AUTH_ORIGIN = 'https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const APP_ORIGIN = 'https://qabum-o1.vercel.app';
const APP_COOKIE = 'paz_neon_session';
const MAX_AGE = 60 * 60 * 24 * 7;

function splitSetCookieFallback(header) {
  if (!header) return [];
  return header.split(/,(?=\s*(?:__Secure-)?[^=;,\s]+=)/g).map(v => v.trim()).filter(Boolean);
}

function upstreamCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  return splitSetCookieFallback(headers.get('set-cookie'));
}

function findSessionPair(cookies) {
  for (const cookie of cookies) {
    const pair = cookie.split(';', 1)[0]?.trim();
    if (pair && /(?:^|__)Secure-better-auth\.session_token=|^better-auth\.session_token=/.test(pair)) return pair;
  }
  return null;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  return Object.fromEntries(new URLSearchParams(raw));
}

function page(error = '') {
  const message = error ? `<p style="color:#C8102E;font-weight:700">${error}</p>` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paz's Sale · Acceso iPhone</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:#f5f7fb;color:#012169}.wrap{max-width:460px;margin:48px auto;padding:24px}.card{background:white;border:1px solid #d9e0ef;border-radius:22px;padding:24px;box-shadow:0 12px 30px rgba(1,33,105,.08)}h1{margin:0 0 8px;font-size:28px}p{line-height:1.45}label{display:block;font-weight:700;margin:18px 0 7px}input{box-sizing:border-box;width:100%;font-size:17px;padding:14px;border:1px solid #aebbd3;border-radius:12px}button{margin-top:22px;width:100%;padding:15px;border:0;border-radius:12px;background:#012169;color:#fff;font-size:17px;font-weight:800}</style></head><body><div class="wrap"><div class="card"><h1>Paz's Sale</h1><p>Acceso seguro para iPhone.</p>${message}<form method="post"><label>Email</label><input name="email" type="email" autocomplete="email" required><label>Contraseña</label><input name="password" type="password" autocomplete="current-password" minlength="8" required><button type="submit">Entrar</button></form></div></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'GET') {
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(page());
  }

  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  try {
    const body = readBody(req);
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    if (!email || password.length < 8) {
      res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(page('Completa email y contraseña.'));
    }

    const upstream = await fetch(`${AUTH_ORIGIN}/sign-in/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'origin': APP_ORIGIN,
        'referer': `${APP_ORIGIN}/liquidacion-paz/`,
        'user-agent': req.headers['user-agent'] || 'PazSale-iOS-login'
      },
      body: JSON.stringify({ email, password, rememberMe: true }),
      redirect: 'manual'
    });

    const cookies = upstreamCookies(upstream.headers);
    const sessionPair = findSessionPair(cookies);
    if (!upstream.ok) {
      console.warn('Paz iOS login upstream rejected', upstream.status);
      res.status(401).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(page('El servidor no aceptó el acceso. No cambies la contraseña; vuelve a intentarlo una vez.'));
    }
    if (!sessionPair) {
      console.warn('Paz iOS login succeeded without session cookie');
      res.status(502).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(page('El acceso fue aceptado pero no se recibió la sesión.'));
    }

    const value = Buffer.from(sessionPair, 'utf8').toString('base64url');
    const expires = new Date(Date.now() + MAX_AGE * 1000).toUTCString();
    res.setHeader('Set-Cookie', `${APP_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}; Expires=${expires}`);
    res.statusCode = 303;
    res.setHeader('Location', '/liquidacion-paz/?iosLogin=ok');
    return res.end();
  } catch (error) {
    console.error('Paz iOS login fallback error', error);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(page('No se pudo completar el acceso. Intenta nuevamente.'));
  }
}
