import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { configureEvent, resetEvent } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'reset') {
      resetEvent();
    } else if (body.action === 'config') {
      configureEvent({ name: body.name, rounds: body.rounds, seconds: body.seconds });
    } else {
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
