import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { snapshot, ensureEvent, currentRound, listQueue } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 401 });
  const snap = snapshot(null);
  const ev = ensureEvent();
  const r = currentRound(ev);
  const queue = r ? listQueue(r.id) : [];
  return NextResponse.json({ ...snap, queue });
}
