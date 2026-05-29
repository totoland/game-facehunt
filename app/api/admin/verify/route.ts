import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { setVerdict } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 401 });
  const { subId, action } = await req.json().catch(() => ({}));
  if (!subId || !['match', 'not', 'skip', 'undo'].includes(action)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  try {
    setVerdict(String(subId), action);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
