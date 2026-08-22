import { signOutPaz, clearPazSessionCookie, requireSameOrigin } from '../../lib/paz-server-auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireSameOrigin(req)) return res.status(403).json({ error: 'forbidden' });
  await signOutPaz(req);
  clearPazSessionCookie(res);
  return res.status(200).json({ ok: true });
}
