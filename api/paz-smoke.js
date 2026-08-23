import { randomUUID } from 'node:crypto';
import {
  signInPaz,
  signUpPaz,
  signOutPaz,
  setPazSessionCookie,
  getPazAuthContext,
} from '../lib/paz-server-auth.js';

const SMOKE_KEY = 'OylTL8MdEH54Xg4KdpSump0FT7s1GIfL';

function captureCookie(sessionPair) {
  let value = '';
  const fakeRes = { setHeader(name, v) { if (String(name).toLowerCase() === 'set-cookie') value = String(v); } };
  setPazSessionCookie(fakeRes, sessionPair);
  return value;
}

function requestWithCookie(req, setCookie) {
  const pair = String(setCookie || '').split(';', 1)[0];
  return {
    ...req,
    headers: {
      ...(req.headers || {}),
      cookie: pair,
    },
  };
}

function cookieFlags(setCookie) {
  const value = String(setCookie || '');
  return {
    httpOnly: /(?:^|;)\s*HttpOnly(?:;|$)/i.test(value),
    secure: /(?:^|;)\s*Secure(?:;|$)/i.test(value),
    sameSiteLax: /(?:^|;)\s*SameSite=Lax(?:;|$)/i.test(value),
    pathRoot: /(?:^|;)\s*Path=\/(?:;|$)/i.test(value),
    persistent: /(?:^|;)\s*Max-Age=\d+/i.test(value) && /(?:^|;)\s*Expires=/i.test(value),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (String(req.query?.key || '') !== SMOKE_KEY) return res.status(404).json({ error: 'not_found' });

  const email = `paz-smoketest-${Date.now()}@example.com`;
  const password = `Smk-${randomUUID()}-Aa9!`;

  try {
    const signup = await signUpPaz(req, email, password, 'Paz Sale Smoke Test');
    const signupSetCookie = captureCookie(signup.sessionPair);
    const signupReq = requestWithCookie(req, signupSetCookie);
    const signupCtx1 = await getPazAuthContext(signupReq);
    const signupCtx2 = await getPazAuthContext(signupReq);

    await signOutPaz(signupReq);
    const afterLogout = await getPazAuthContext(signupReq);

    const login = await signInPaz(req, email, password);
    const loginSetCookie = captureCookie(login.sessionPair);
    const loginReq = requestWithCookie(req, loginSetCookie);
    const loginCtx1 = await getPazAuthContext(loginReq);
    const loginCtx2 = await getPazAuthContext(loginReq);

    const flags = cookieFlags(loginSetCookie);
    const checks = {
      signupAuthenticated: signupCtx1?.user?.email === email,
      signupPersistsAcrossSecondRead: signupCtx2?.user?.email === email,
      signupJwtAvailable: Boolean(signupCtx1?.jwt),
      logoutInvalidatesSession: !afterLogout?.user,
      loginAuthenticated: loginCtx1?.user?.email === email,
      loginPersistsAcrossSecondRead: loginCtx2?.user?.email === email,
      loginJwtAvailable: Boolean(loginCtx1?.jwt),
      cookieHttpOnly: flags.httpOnly,
      cookieSecure: flags.secure,
      cookieSameSiteLax: flags.sameSiteLax,
      cookiePathRoot: flags.pathRoot,
      cookiePersistent: flags.persistent,
    };

    const ok = Object.values(checks).every(Boolean);
    return res.status(ok ? 200 : 500).json({ ok, email, checks });
  } catch (error) {
    console.error('Paz Sale smoke test failed', error?.status, error?.message);
    return res.status(500).json({ ok: false, email, error: error?.message || 'smoke_failed' });
  }
}
