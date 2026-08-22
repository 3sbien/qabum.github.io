const AUTH_ORIGIN = 'https://ep-silent-credit-awhuo8p7.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const DATA_URL = 'https://ep-silent-credit-awhuo8p7.apirest.c-12.us-east-1.aws.neon.tech/neondb/rest/v1';
const APP_COOKIE = 'paz_neon_session';

function parseCookieHeader(raw = '', name) {
  for (const part of String(raw).split(';')) {
    const p = part.trim();
    const idx = p.indexOf('=');
    if (idx < 0) continue;
    if (p.slice(0, idx) === name) return p.slice(idx + 1);
  }
  return null;
}

function decodeSessionPair(req) {
  const stored = parseCookieHeader(req.headers?.cookie || '', APP_COOKIE);
  if (!stored) return null;
  try {
    const pair = Buffer.from(stored, 'base64url').toString('utf8');
    if (/(?:^|__)Secure-better-auth\.session_token=|^better-auth\.session_token=/.test(pair)) return pair;
  } catch {}
  return null;
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
    const preferred = ['token', 'jwt', 'accessToken', 'access_token', 'idToken', 'id_token'];
    for (const key of preferred) {
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

async function authFetch(endpoint, sessionPair, req) {
  const headers = {
    accept: 'application/json',
    cookie: sessionPair,
  };
  if (req.headers?.['user-agent']) headers['user-agent'] = req.headers['user-agent'];
  return fetch(`${AUTH_ORIGIN}/${endpoint}`, { headers, cache: 'no-store' });
}

async function loadJwt(sessionPair, req) {
  const response = await authFetch('token', sessionPair, req);
  if (!response.ok) return null;
  for (const name of ['set-auth-jwt', 'set-auth-token', 'authorization']) {
    const found = jwtFromValue(response.headers.get(name));
    if (found) return found;
  }
  const text = await response.text();
  try {
    const found = findJwt(JSON.parse(text));
    if (found) return found;
  } catch {
    const found = jwtFromValue(text);
    if (found) return found;
  }
  return null;
}

async function loadTeamMember(userId, jwt) {
  const url = new URL(`${DATA_URL}/paz_sale_team_members`);
  url.searchParams.set('select', 'user_id,owner_user_id,role,display_name');
  url.searchParams.set('user_id', `eq.${userId}`);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${jwt}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const rows = await response.json();
  const member = Array.isArray(rows) ? rows[0] : null;
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return null;
  return member;
}

export async function getPazAuthContext(req) {
  const sessionPair = decodeSessionPair(req);
  if (!sessionPair) return null;

  const sessionResponse = await authFetch('get-session', sessionPair, req);
  if (!sessionResponse.ok) return null;
  let sessionPayload;
  try { sessionPayload = await sessionResponse.json(); } catch { return null; }
  const normalized = normalizeSession(sessionPayload);
  if (!normalized?.user?.id) return null;

  const jwt = await loadJwt(sessionPair, req);
  if (!jwt) return null;
  const member = await loadTeamMember(normalized.user.id, jwt);
  if (!member) return null;

  return { user: normalized.user, session: normalized.session, member, jwt };
}
