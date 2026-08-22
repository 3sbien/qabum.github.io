const AUTH_ORIGIN = 'https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const APP_COOKIE = 'paz_neon_session';
const APP_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function parseBrowserCookie(req, name) {
  const raw = req.headers?.cookie || '';
  for (const part of raw.split(';')) {
    const p = part.trim();
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    if (p.slice(0, idx) === name) return p.slice(idx + 1);
  }
  return null;
}

function decodeStoredSession(req) {
  const stored = parseBrowserCookie(req, APP_COOKIE);
  if (!stored) return null;
  try {
    const pair = Buffer.from(stored, 'base64url').toString('utf8');
    return /(^|__)Secure-better-auth\.session_token=|better-auth\.session_token=/.test(pair) ? pair : null;
  } catch {
    return null;
  }
}

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

function setAppSessionCookie(res, sessionPair) {
  const value = Buffer.from(sessionPair, 'utf8').toString('base64url');
  res.setHeader('Set-Cookie', `${APP_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${APP_COOKIE_MAX_AGE}`);
}

function clearAppSessionCookie(res) {
  res.setHeader('Set-Cookie', `${APP_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
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
    for (const key of ['accept','content-type','origin','referer','user-agent','authorization','x-neon-client-info','x-force-fetch']) {
      const value = req.headers?.[key];
      if (value != null) headers[key] = value;
    }

    const storedSession = decodeStoredSession(req);
    if (storedSession) headers.cookie = storedSession;

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

    const cookies = upstreamCookies(upstream.headers);
    const sessionPair = findSessionPair(cookies);
    if (sessionPair && !/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(cookies.find(c => c.startsWith(sessionPair)) || '')) {
      setAppSessionCookie(res, sessionPair);
    } else if (endpoint === 'sign-out') {
      clearAppSessionCookie(res);
    }

    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(data);
  } catch (error) {
    console.error('Paz auth proxy error', endpoint, error);
    res.status(502).json({ error: 'auth_proxy_unavailable' });
  }
}
