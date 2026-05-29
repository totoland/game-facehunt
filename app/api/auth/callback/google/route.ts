import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUserByEmail } from '@/lib/game';
import { setUserSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function origin(req: NextRequest) {
  return process.env.PUBLIC_ORIGIN || req.nextUrl.origin;
}
// Redirect back to the public origin (not req.nextUrl.origin — behind the tunnel
// the Host header is localhost:3099, which would bounce the user to localhost).
const home = (req: NextRequest, q = '') => NextResponse.redirect(new URL('/' + q, origin(req)));

interface IdClaims { email?: string; email_verified?: boolean; name?: string; hd?: string; picture?: string }

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return home(req, '?error=google_unavailable');

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const saved = req.cookies.get('fh_oauth')?.value;
  if (!code || !state || !saved || state !== saved) return home(req, '?error=oauth_state');

  // Exchange the code for tokens.
  let idToken: string;
  try {
    const body = new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: `${origin(req)}/api/auth/callback/google`,
      grant_type: 'authorization_code',
    });
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const tok = await r.json();
    if (!r.ok || !tok.id_token) return home(req, '?error=oauth_exchange');
    idToken = tok.id_token;
  } catch {
    return home(req, '?error=oauth_exchange');
  }

  // Decode the id_token payload (received directly from Google over TLS).
  let claims: IdClaims;
  try {
    claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return home(req, '?error=oauth_token');
  }
  if (!claims.email || claims.email_verified === false) return home(req, '?error=oauth_email');
  if (process.env.ALLOWED_HD && claims.hd !== process.env.ALLOWED_HD) return home(req, '?error=domain');

  const { user, created } = findOrCreateUserByEmail(claims.email, claims.name, claims.picture);
  await setUserSession(user.id);

  const res = home(req, created ? '?setup=1' : '');
  res.cookies.delete('fh_oauth');
  return res;
}
