import { getPazAuthContext, dataApiFetch, requireSameOrigin } from '../../lib/paz-server-auth.js';

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
  const firstPhoto = Array.isArray(item?.photos) && item.photos[0] ? item.photos[0] : null;
  return {
    id: String(item.id),
    owner_user_id: ownerUserId,
    title: String(item.title || ''),
    description: String(item.description || ''),
    category: String(item.category || ''),
    status: String(item.status || 'DISPONIBLE'),
    asking_price: Number(item.askingPrice || 0),
    photos: firstPhoto ? [firstPhoto] : [],
    updated_at: updatedAt,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  try {
    const ctx = await requireMember(req, res);
    if (!ctx) return;

    if (req.method === 'GET') {
      const params = new URLSearchParams({
        select: 'id,payload,updated_at',
        order: 'updated_at.desc',
      });
      const rows = await dataApiFetch(`paz_sale_private_items?${params}`, ctx.jwt);
      return res.status(200).json({ items: Array.isArray(rows) ? rows : [] });
    }

    if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden_origin' });

    if (req.method === 'PUT') {
      const item = req.body?.item ?? req.body;
      if (!item || !item.id) return res.status(400).json({ error: 'invalid_item' });
      const updatedAt = new Date().toISOString();
      const privateRow = {
        id: String(item.id),
        payload: item,
        updated_at: updatedAt,
        updated_by: ctx.user.id,
      };
      await dataApiFetch('paz_sale_private_items?on_conflict=id', ctx.jwt, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: privateRow,
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
        await dataApiFetch(`paz_sale_private_items?id=${qid}`, ctx.jwt, { method: 'DELETE' });
        const owner = encodeURIComponent(`eq.${ctx.member.owner_user_id}`);
        await dataApiFetch(`paz_sale_public_items?id=${qid}&owner_user_id=${owner}`, ctx.jwt, { method: 'DELETE' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    console.error('Paz Sale items API error', error?.status, error?.message, error?.data || '');
    return res.status(error?.status >= 400 && error?.status < 600 ? error.status : 500).json({ error: 'items_failed', message: error?.message || 'Error de inventario' });
  }
}
