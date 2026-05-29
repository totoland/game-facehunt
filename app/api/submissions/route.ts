import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/session';
import { submit } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  const { image } = await req.json().catch(() => ({}));
  if (!image) return NextResponse.json({ error: 'no image' }, { status: 400 });
  try {
    const sub = submit(id, String(image));
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 423 });
  }
}
