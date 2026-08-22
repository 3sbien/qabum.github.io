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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  try {
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

    const settings = req.body?.settings ?? req.body ?? {};
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
  } catch (error) {
    console.error('Paz Sale settings API error', error?.status, error?.message, error?.data || '');
    return res.status(error?.status >= 400 && error?.status < 600 ? error.status : 500).json({ error: 'settings_failed', message: error?.message || 'Error de ajustes' });
  }
}
