import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-secret';
const PLAYER_COOKIE = 'fh_session';
const ADMIN_COOKIE = 'fh_admin';

function sign(value: string): string {
  const mac = crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf('.');
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
  // timing-safe compare
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: (process.env.PUBLIC_ORIGIN || '').startsWith('https'),
  path: '/',
  maxAge: 60 * 60 * 12, // 12h — covers an event night
};

/* ---------- player session ---------- */
export async function getUserId(): Promise<string | null> {
  const c = await cookies();
  return verify(c.get(PLAYER_COOKIE)?.value);
}

export async function setUserSession(userId: string) {
  const c = await cookies();
  c.set(PLAYER_COOKIE, sign(userId), cookieOpts);
}

export async function clearUserSession() {
  const c = await cookies();
  c.delete(PLAYER_COOKIE);
}

/* ---------- admin session ---------- */
export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return verify(c.get(ADMIN_COOKIE)?.value) === 'ok';
}

export async function setAdminSession() {
  const c = await cookies();
  c.set(ADMIN_COOKIE, sign('ok'), cookieOpts);
}

export async function clearAdminSession() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}
