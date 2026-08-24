import {
  signInPaz,
  signUpPaz,
  signOutPaz,
  setPazSessionCookie,
  clearPazSessionCookie,
  getPazAuthContext,
  dataApiFetch,
  requireSameOrigin,
} from '../../lib/paz-server-auth.js';

function noCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  if ((req.headers?.['content-type'] || '').includes('application/json')) {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

function safeReturnTo(value) {
  const v = String(value || '/liquidacion-paz/');
  return v.startsWith('/') && !v.startsWith('//') ? v : '/liquidacion-paz/';
}

function appendAuth(returnTo, code) {
  return `${returnTo}${returnTo.includes('?') ? '&' : '?'}auth=${encodeURIComponent(code)}`;
}

function routePath(req) {
  const queryPath = req.query?.path;
  if (Array.isArray(queryPath) && queryPath.length) return queryPath.join('/').replace(/^\/+|\/+$/g, '');
  if (typeof queryPath === 'string' && queryPath) return queryPath.replace(/^\/+|\/+$/g, '');

  try {
    const host = String(req.headers?.host || 'localhost');
    const pathname = new URL(String(req.url || '/'), `https://${host}`).pathname;
    const marker = '/api/paz/';
    if (!pathname.startsWith(marker)) return '';
    return decodeURIComponent(pathname.slice(marker.length)).replace(/^\/+|\/+$/g, '');
  } catch {
    return '';
  }
}

async function requireMember(req, res) {
  const ctx = await getPazAuthContext(req);
  if (!ctx?.user || !ctx?.jwt) {
    res.status(401).json({ error: 'not_authenticated' });
    return null;
  }
  if (!ctx.member || !['OWNER','ADMIN'].includes(ctx.member.role)) {
    res.status(403).json({ error: 'not_authorized' });
    return null;
  }
  return ctx;
}

function publicRow(item, ownerUserId, updatedAt) {
  const publicPhotos = Array.isArray(item?.photos)
    ? item.photos.filter((photo) => typeof photo === 'string' && photo).slice(0, 5)
    : [];
  return {
    id: String(item.id),
    owner_user_id: ownerUserId,
    title: String(item.title || ''),
    description: String(item.description || ''),
    category: String(item.category || ''),
    status: String(item.status || 'DISPONIBLE'),
    asking_price: Number(item.askingPrice || 0),
    photos: publicPhotos,
    updated_at: updatedAt,
  };
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const returnTo = safeReturnTo(body.returnTo);
  if (!email || password.length < 8) return res.redirect(303, appendAuth(returnTo, 'invalid'));
  try {
    const { sessionPair } = await signInPaz(req, email, password);
    setPazSessionCookie(res, sessionPair);
    return res.redirect(303, appendAuth(returnTo, 'ok'));
  } catch (error) {
    console.error('Paz Sale login failed', error?.status, error?.message);
    return res.redirect(303, appendAuth(returnTo, 'invalid'));
  }
}

async function handleSignup(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || 'Usuario').trim().slice(0, 80) || 'Usuario';
  const returnTo = safeReturnTo(body.returnTo);
  if (!email || password.length < 8) return res.redirect(303, appendAuth(returnTo, 'invalid'));
  try {
    const { sessionPair } = await signUpPaz(req, email, password, name);
    setPazSessionCookie(res, sessionPair);
    return res.redirect(303, appendAuth(returnTo, 'created'));
  } catch (error) {
    console.error('Paz Sale signup failed', error?.status, error?.message);
    const code = /exist|already/i.test(error?.message || '') ? 'exists' : 'signup';
    return res.redirect(303, appendAuth(returnTo, code));
  }
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden_origin' });
  await signOutPaz(req);
  clearPazSessionCookie(res);
  return res.status(200).json({ ok: true });
}

async function handleSession(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const ctx = await getPazAuthContext(req);
    if (!ctx?.user) return res.status(200).json({ authenticated: false, user: null, member: null });
    return res.status(200).json({
      authenticated: true,
      user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name || '' },
      member: ctx.member || null,
    });
  } catch (error) {
    console.error('Paz Sale session error', error);
    return res.status(200).json({ authenticated: false, user: null, member: null });
  }
}

async function handleItems(req, res) {
  const ctx = await requireMember(req, res);
  if (!ctx) return;

  if (req.method === 'GET') {
    const params = new URLSearchParams({ select: 'id,payload,updated_at', order: 'updated_at.desc' });
    const rows = await dataApiFetch(`paz_sale_private_items?${params}`, ctx.jwt);
    return res.status(200).json({ items: Array.isArray(rows) ? rows : [] });
  }

  if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden_origin' });

  if (req.method === 'PUT') {
    const body = readBody(req);
    const item = body?.item ?? body;
    if (!item || !item.id) return res.status(400).json({ error: 'invalid_item' });
    const updatedAt = new Date().toISOString();
    await dataApiFetch('paz_sale_private_items?on_conflict=id', ctx.jwt, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { id: String(item.id), payload: item, updated_at: updatedAt, updated_by: ctx.user.id },
    });
    await dataApiFetch('paz_sale_public_items?on_conflict=id', ctx.jwt, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: publicRow(item, ctx.member.owner_user_id, updatedAt),
    });
    return res.status(200).json({ ok: true, updatedAt });
  }

  if (req.method === 'DELETE') {
    const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
    const all = String(Array.isArray(req.query?.all) ? req.query.all[0] : req.query?.all || '') === '1';
    if (!id && !all) return res.status(400).json({ error: 'missing_id' });
    if (all) {
      await dataApiFetch('paz_sale_private_items?id=neq.__never__', ctx.jwt, { method: 'DELETE' });
      const owner = encodeURIComponent(`eq.${ctx.member.owner_user_id}`);
      await dataApiFetch(`paz_sale_public_items?owner_user_id=${owner}`, ctx.jwt, { method: 'DELETE' });
    } else {
      const qid = encodeURIComponent(`eq.${id}`);
      const owner = encodeURIComponent(`eq.${ctx.member.owner_user_id}`);
      await dataApiFetch(`paz_sale_private_items?id=${qid}`, ctx.jwt, { method: 'DELETE' });
      await dataApiFetch(`paz_sale_public_items?id=${qid}&owner_user_id=${owner}`, ctx.jwt, { method: 'DELETE' });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

async function handleSettings(req, res) {
  const ctx = await requireMember(req, res);
  if (!ctx) return;

  if (req.method === 'GET') {
    const params = new URLSearchParams({ select: 'payload,updated_at', id: 'eq.main', limit: '1' });
    const rows = await dataApiFetch(`paz_sale_private_settings?${params}`, ctx.jwt);
    const row = Array.isArray(rows) ? rows[0] : null;
    return res.status(200).json({ settings: row?.payload || null, updatedAt: row?.updated_at || null });
  }

  if (req.method !== 'PUT') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden_origin' });

  const body = readBody(req);
  const settings = body?.settings ?? body ?? {};
  const updatedAt = new Date().toISOString();
  await dataApiFetch('paz_sale_private_settings?on_conflict=id', ctx.jwt, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { id: 'main', payload: settings, updated_at: updatedAt, updated_by: ctx.user.id },
  });
  await dataApiFetch('paz_sale_public_settings?on_conflict=owner_user_id', ctx.jwt, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      owner_user_id: ctx.member.owner_user_id,
      catalog_title: String(settings.catalogTitle || "Paz's Sale"),
      contact_name: String(settings.contactName || ''),
      contact_phone: String(settings.contactPhone || ''),
      location_text: String(settings.locationText || ''),
      updated_at: updatedAt,
    },
  });
  return res.status(200).json({ ok: true, updatedAt });
}

export default async function handler(req, res) {
  noCache(res);
  const path = routePath(req);
  try {
    if (path === 'login') return await handleLogin(req, res);
    if (path === 'signup') return await handleSignup(req, res);
    if (path === 'logout') return await handleLogout(req, res);
    if (path === 'session') return await handleSession(req, res);
    if (path === 'items') return await handleItems(req, res);
    if (path === 'settings') return await handleSettings(req, res);
    return res.status(404).json({ error: 'not_found' });
  } catch (error) {
    console.error('Paz Sale API error', path, error?.status, error?.message, error?.data || '');
    const status = error?.status >= 400 && error?.status < 600 ? error.status : 500;
    return res.status(status).json({ error: 'request_failed', message: error?.message || 'No se pudo completar la operación.' });
  }
}
