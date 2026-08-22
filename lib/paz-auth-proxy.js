const AUTH_ORIGIN = 'https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

function cookieForThisHost(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
}

export async function proxyPazAuth(req, res, endpoint) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (value == null) continue;
      if (Array.isArray(value)) value.forEach(v => query.append(key, String(v)));
      else query.append(key, String(value));
    }
    const target = `${AUTH_ORIGIN}/${endpoint}${query.size ? `?${query}` : ''}`;
    const headers = {};
    for (const key of ['accept','content-type','cookie','origin','referer','user-agent','authorization','x-neon-client-info','x-force-fetch']) {
      const value = req.headers?.[key];
      if (value != null) headers[key] = value;
    }
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (Buffer.isBuffer(req.body)) body = req.body;
      else if (typeof req.body === 'string') body = req.body;
      else if (req.body != null) body = JSON.stringify(req.body);
    }
    const upstream = await fetch(target, { method: req.method, headers, body, redirect: 'manual' });
    for (const key of ['content-type','cache-control','location','set-auth-jwt','set-auth-token','x-neon-ret-request-id']) {
      const value = upstream.headers.get(key);
      if (value != null) res.setHeader(key, value);
    }
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
    console.error('Paz auth proxy error', endpoint, error);
    res.status(502).json({ error: 'auth_proxy_unavailable' });
  }
}
