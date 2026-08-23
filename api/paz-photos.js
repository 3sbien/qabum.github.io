import { put, del } from '@vercel/blob';
import { getPazAuthContext, requireSameOrigin } from '../lib/paz-server-auth.js';

const PUBLIC_TOKEN = process.env.PAZ_PUBLIC_READ_WRITE_TOKEN || process.env.PAZ_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
const PRIVATE_TOKEN = process.env.PAZ_PRIVATE_READ_WRITE_TOKEN || process.env.PAZ_PRIVATE_BLOB_READ_WRITE_TOKEN || '';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function noCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function q(req, name) {
  const v = req.query?.[name];
  return Array.isArray(v) ? v[0] : v;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function parseDataUrl(value) {
  const text = String(value || '');
  const m = text.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!m) throw Object.assign(new Error('invalid_image'), { status: 400 });
  const type = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
  const buffer = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error('image_too_large'), { status: 413 });
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return { buffer, type, ext };
}

function safePart(value, fallback = 'item') {
  const s = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return s || fallback;
}

function isPrivateBlobUrl(value) {
  try {
    const u = new URL(String(value || ''));
    return u.protocol === 'https:' && u.hostname.endsWith('.private.blob.vercel-storage.com') && u.pathname.includes('/paz-sale/');
  } catch { return false; }
}

function isPublicBlobUrl(value) {
  try {
    const u = new URL(String(value || ''));
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com') && u.pathname.includes('/paz-sale/');
  } catch { return false; }
}

function unwrapPrivateRef(value) {
  const text = String(value || '');
  if (isPrivateBlobUrl(text)) return text;
  try {
    const u = new URL(text, 'https://pazventa.qabum.com');
    if (u.pathname !== '/api/paz-photos') return null;
    const src = u.searchParams.get('src');
    return isPrivateBlobUrl(src) ? src : null;
  } catch { return null; }
}

function protectedPrivateUrl(blobUrl) {
  return `/api/paz-photos?action=private&src=${encodeURIComponent(blobUrl)}`;
}

async function requireMember(req, res) {
  const ctx = await getPazAuthContext(req);
  if (!ctx?.user || !ctx?.jwt) {
    res.status(401).json({ error: 'not_authenticated' });
    return null;
  }
  if (!ctx.member || !['OWNER', 'ADMIN'].includes(ctx.member.role)) {
    res.status(403).json({ error: 'not_authorized' });
    return null;
  }
  return ctx;
}

async function upload(req, res, ctx) {
  if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden_origin' });
  const body = readBody(req);
  const kind = body.kind === 'private' ? 'private' : body.kind === 'public' ? 'public' : '';
  if (!kind) return res.status(400).json({ error: 'invalid_kind' });
  const token = kind === 'private' ? PRIVATE_TOKEN : PUBLIC_TOKEN;
  if (!token) return res.status(503).json({ error: `${kind}_blob_not_configured` });

  const { buffer, type, ext } = parseDataUrl(body.dataUrl);
  const owner = safePart(ctx.member.owner_user_id, 'owner');
  const itemId = safePart(body.itemId, 'item');
  const index = Number.isFinite(Number(body.index)) ? Math.max(0, Math.min(9, Number(body.index))) : 0;
  const pathname = `paz-sale/${owner}/${itemId}/${kind}-${index}-${Date.now()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: kind,
    token,
    contentType: type,
    addRandomSuffix: true,
  });

  if (kind === 'private') {
    return res.status(200).json({ ok: true, url: protectedPrivateUrl(blob.url) });
  }
  return res.status(200).json({ ok: true, url: blob.url });
}

async function servePrivate(req, res) {
  const ctx = await requireMember(req, res);
  if (!ctx) return;
  if (!PRIVATE_TOKEN) return res.status(503).json({ error: 'private_blob_not_configured' });
  const src = String(q(req, 'src') || '');
  if (!isPrivateBlobUrl(src)) return res.status(400).json({ error: 'invalid_private_blob' });

  const r = await fetch(src, {
    headers: { Authorization: `Bearer ${PRIVATE_TOKEN}` },
    cache: 'no-store',
  });
  if (!r.ok) return res.status(r.status === 404 ? 404 : 502).json({ error: 'private_blob_unavailable' });
  const body = Buffer.from(await r.arrayBuffer());
  res.statusCode = 200;
  res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('Cache-Control', 'private, no-store');
  return res.end(body);
}

async function remove(req, res, ctx) {
  if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden_origin' });
  const body = readBody(req);
  const urls = Array.isArray(body.urls) ? body.urls.slice(0, 20) : [];
  const publicUrls = [];
  const privateUrls = [];
  for (const value of urls) {
    const text = String(value || '');
    if (isPublicBlobUrl(text)) publicUrls.push(text);
    else {
      const direct = unwrapPrivateRef(text);
      if (direct) privateUrls.push(direct);
    }
  }
  if (publicUrls.length && PUBLIC_TOKEN) await del(publicUrls, { token: PUBLIC_TOKEN });
  if (privateUrls.length && PRIVATE_TOKEN) await del(privateUrls, { token: PRIVATE_TOKEN });
  return res.status(200).json({ ok: true, deleted: publicUrls.length + privateUrls.length, owner: ctx.member.owner_user_id });
}

export default async function handler(req, res) {
  noCache(res);
  const action = String(q(req, 'action') || '');

  if (req.method === 'GET' && action === 'health') {
    return res.status(200).json({ ok: true, publicConfigured: Boolean(PUBLIC_TOKEN), privateConfigured: Boolean(PRIVATE_TOKEN) });
  }
  if (req.method === 'GET' && action === 'private') return servePrivate(req, res);

  const ctx = await requireMember(req, res);
  if (!ctx) return;
  try {
    if (req.method === 'POST') return await upload(req, res, ctx);
    if (req.method === 'DELETE') return await remove(req, res, ctx);
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    console.error('Paz Sale Blob error', error?.status, error?.message);
    const status = error?.status >= 400 && error?.status < 600 ? error.status : 500;
    return res.status(status).json({ error: error?.message || 'blob_request_failed' });
  }
}
