const AUTH_ORIGIN = 'https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const DATA_URL = 'https://ep-silent-credit-awhuo8p7.apirest.c-12.us-east-1.aws.neon.tech/neondb/rest/v1';
const COOKIE_NAME = 'paz_sale_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const TRUSTED_ORIGIN = process.env.PAZ_AUTH_TRUSTED_ORIGIN || 'https://qabum-o1.vercel.app';

function parseCookieHeader(raw = '', name) {
  for (const part of String(raw).split(';')) {
    const p = part.trim();
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    if (p.slice(0, idx) === name) return p.slice(idx + 1);
  }
  return null;
}

function splitSetCookieFallback(header) {
  if (!header) return [];
  return String(header).split(/,(?=\s*(?:__Secure-)?[^=;,\s]+=)/g).map(v => v.trim()).filter(Boolean);
}

function upstreamCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  return splitSetCookieFallback(headers.get('set-cookie'));
}

function findSessionPair(cookies = []) {
  for (const cookie of cookies) {
    const pair = String(cookie).split(';', 1)[0]?.trim();
    if (pair && /^(?:__Secure-)?better-auth\.session_token=/.test(pair)) return pair;
  }
  return null;
}

function encodeSessionPair(pair) {
  return Buffer.from(pair, 'utf8').toString('base64url');
}

function decodeSessionPair(req) {
  const stored = parseCookieHeader(req.headers?.cookie || '', COOKIE_NAME);
  if (!stored) return null;
  try {
    const pair = Buffer.from(stored, 'base64url').toString('utf8');
    return /^(?:__Secure-)?better-auth\.session_token=/.test(pair) ? pair : null;
  } catch {
    return null;
  }
}

export function setPazSessionCookie(res, sessionPair) {
  const value = encodeSessionPair(sessionPair);
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Expires=${expires}`);
}

export function clearPazSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

function trustedHeaders(req, extra = {}) {
  return {
    accept: 'application/json',
    origin: TRUSTED_ORIGIN,
    referer: `${TRUSTED_ORIGIN}/liquidacion-paz/`,
    'user-agent': req.headers?.['user-agent'] || 'PazSale',
    ...extra,
  };
}

async function authRequest(endpoint, req, { method = 'GET', sessionPair = null, body = null } = {}) {
  const headers = trustedHeaders(req);
  if (sessionPair) headers.cookie = sessionPair;
  if (body != null) headers['content-type'] = 'application/json';
  return fetch(`${AUTH_ORIGIN}/${endpoint}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
    redirect: 'manual',
    cache: 'no-store',
  });
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function signInPaz(req, email, password) {
  const response = await authRequest('sign-in/email', req, {
    method: 'POST',
    body: { email, password, rememberMe: true },
  });
  const payload = await readJsonSafe(response);
  const sessionPair = findSessionPair(upstreamCookies(response.headers));
  if (!response.ok || !sessionPair) {
    const message = payload?.message || payload?.error?.message || payload?.error || 'No se pudo iniciar sesión.';
    const error = new Error(message);
    error.status = response.status || 401;
    throw error;
  }
  return { sessionPair, payload };
}

export async function signUpPaz(req, email, password, name) {
  const response = await authRequest('sign-up/email', req, {
    method: 'POST',
    body: { email, password, name: name || 'Usuario' },
  });
  const payload = await readJsonSafe(response);
  const sessionPair = findSessionPair(upstreamCookies(response.headers));
  if (!response.ok || !sessionPair) {
    const message = payload?.message || payload?.error?.message || payload?.error || 'No se pudo crear la cuenta.';
    const error = new Error(message);
    error.status = response.status || 400;
    throw error;
  }
  return { sessionPair, payload };
}

export async function signOutPaz(req) {
  const sessionPair = decodeSessionPair(req);
  if (!sessionPair) return;
  try {
    await authRequest('sign-out', req, { method: 'POST', sessionPair, body: {} });
  } catch {}
}

function normalizeSession(payload) {
  const root = payload?.data ?? payload ?? null;
  if (root?.user) return { user: root.user, session: root.session || null };
  if (root?.session?.user) return { user: root.session.user, session: root.session };
  return null;
}

function jwtFromValue(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/^Bearer\s+/i, '').trim();
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cleaned) ? cleaned : null;
}

function findJwt(value, depth = 0) {
  if (depth > 5 || value == null) return null;
  const direct = jwtFromValue(value);
  if (direct) return direct;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJwt(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of ['token','jwt','accessToken','access_token','idToken','id_token']) {
      const found = findJwt(value[key], depth + 1);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = findJwt(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function loadJwt(req, sessionPair) {
  const response = await authRequest('token', req, { sessionPair });
  if (!response.ok) return null;
  for (const name of ['set-auth-jwt','set-auth-token','authorization']) {
    const found = jwtFromValue(response.headers.get(name));
    if (found) return found;
  }
  return findJwt(await readJsonSafe(response));
}

export async function dataApiFetch(path, jwt, options = {}) {
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${jwt}`,
    ...(options.headers || {}),
  };
  if (options.body != null && !headers['content-type']) headers['content-type'] = 'application/json';
  const response = await fetch(`${DATA_URL}/${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body == null ? undefined : (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)),
    cache: 'no-store',
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error = new Error(data?.message || data?.details || data?.hint || `Data API ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function loadTeamMember(userId, jwt) {
  const params = new URLSearchParams({
    select: 'user_id,owner_user_id,role,display_name',
    user_id: `eq.${userId}`,
    limit: '1',
  });
  const rows = await dataApiFetch(`paz_sale_team_members?${params}`, jwt);
  const member = Array.isArray(rows) ? rows[0] : null;
  if (!member || !['OWNER','ADMIN'].includes(member.role)) return null;
  return member;
}

export async function getPazAuthContext(req) {
  const sessionPair = decodeSessionPair(req);
  if (!sessionPair) return null;

  const sessionResponse = await authRequest('get-session', req, { sessionPair });
  if (!sessionResponse.ok) return null;
  const normalized = normalizeSession(await readJsonSafe(sessionResponse));
  if (!normalized?.user?.id) return null;

  const jwt = await loadJwt(req, sessionPair);
  if (!jwt) return { user: normalized.user, session: normalized.session, member: null, jwt: null };

  const member = await loadTeamMember(normalized.user.id, jwt);
  return { user: normalized.user, session: normalized.session, member, jwt };
}

export function requireSameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === String(req.headers?.host || '');
  } catch {
    return false;
  }
}
