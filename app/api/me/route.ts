import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/session';
import { getUser, publicUser } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const id = await getUserId();
  const u = id ? getUser(id) : null;
  return NextResponse.json({ user: publicUser(u) });
}
