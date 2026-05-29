import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function origin(req: NextRequest) {
  return process.env.PUBLIC_ORIGIN || req.nextUrl.origin;
}

// Kick off the Google OAuth dance.
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/?error=google_unavailable', origin(req)));
  }
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${origin(req)}/api/auth/callback/google`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);
  if (process.env.ALLOWED_HD) url.searchParams.set('hd', process.env.ALLOWED_HD);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set('fh_oauth', state, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
    secure: (process.env.PUBLIC_ORIGIN || '').startsWith('https'),
  });
  return res;
}
