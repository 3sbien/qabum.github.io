const AUTH_ORIGIN = 'https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

function cookieForThisHost(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
}

export default async function handler(req, res) {
  try {
    const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path || ''];
    const path = pathParts.filter(Boolean).map(encodeURIComponent).join('/');
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'path' || value == null) continue;
      if (Array.isArray(value)) value.forEach(v => query.append(key, String(v)));
      else query.append(key, String(value));
    }
    const target = `${AUTH_ORIGIN}/${path}${query.size ? `?${query}` : ''}`;

    const headers = {};
    const skipRequestHeaders = new Set(['host', 'content-length', 'connection', 'transfer-encoding', 'accept-encoding']);
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (!skipRequestHeaders.has(key.toLowerCase()) && value != null) headers[key] = value;
    }

    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (Buffer.isBuffer(req.body)) body = req.body;
      else if (typeof req.body === 'string') body = req.body;
      else if (req.body != null) body = JSON.stringify(req.body);
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual'
    });

    const skipResponseHeaders = new Set(['set-cookie', 'content-length', 'content-encoding', 'transfer-encoding', 'connection']);
    upstream.headers.forEach((value, key) => {
      if (!skipResponseHeaders.has(key.toLowerCase())) res.setHeader(key, value);
    });

    let cookies = [];
    if (typeof upstream.headers.getSetCookie === 'function') cookies = upstream.headers.getSetCookie();
    else {
      const single = upstream.headers.get('set-cookie');
      if (single) cookies = [single];
    }
    if (cookies.length) res.setHeader('Set-Cookie', cookies.map(cookieForThisHost));

    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(data);
  } catch (error) {
    console.error('Paz auth proxy error', error);
    res.status(502).json({ error: 'auth_proxy_unavailable' });
  }
}
