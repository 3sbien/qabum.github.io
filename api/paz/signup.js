import { signUpPaz, setPazSessionCookie } from '../../lib/paz-server-auth.js';

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  return Object.fromEntries(new URLSearchParams(raw));
}

function safeReturnTo(value) {
  const v = String(value || '/liquidacion-paz/');
  return v.startsWith('/') && !v.startsWith('//') ? v : '/liquidacion-paz/';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const body = readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || 'Usuario').trim().slice(0, 80) || 'Usuario';
  const returnTo = safeReturnTo(body.returnTo);
  if (!email || password.length < 8) return res.redirect(303, `${returnTo}${returnTo.includes('?') ? '&' : '?'}auth=invalid`);

  try {
    const { sessionPair } = await signUpPaz(req, email, password, name);
    setPazSessionCookie(res, sessionPair);
    return res.redirect(303, `${returnTo}${returnTo.includes('?') ? '&' : '?'}auth=created`);
  } catch (error) {
    console.error('Paz Sale signup failed', error?.status, error?.message);
    const code = /exist|already/i.test(error?.message || '') ? 'exists' : 'signup';
    return res.redirect(303, `${returnTo}${returnTo.includes('?') ? '&' : '?'}auth=${code}`);
  }
}
