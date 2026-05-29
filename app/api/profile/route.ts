import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/session';
import { updateProfile, getUser, publicUser } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  // Nickname is locked after login — we deliberately ignore any nickname in the body.
  const { selfie } = await req.json().catch(() => ({}));
  try {
    updateProfile(id, typeof selfie === 'string' ? selfie : undefined);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ user: publicUser(getUser(id)) });
}
