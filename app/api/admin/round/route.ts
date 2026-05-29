import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { startRound, endHunt, revealResult, nextRound } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  try {
    if (action === 'start') startRound();
    else if (action === 'end') endHunt();
    else if (action === 'reveal') revealResult();
    else if (action === 'next') nextRound();
    else return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
