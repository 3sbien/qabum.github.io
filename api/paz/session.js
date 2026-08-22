import { getPazAuthContext } from '../../lib/paz-server-auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
