import { NextRequest, NextResponse } from 'next/server';
import { setAdminSession, clearAdminSession, isAdmin } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}

export async function POST(req: NextRequest) {
  const { code } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_CODE || 'letmein';
  if (!code || String(code) !== expected) {
    return NextResponse.json({ error: 'wrong admin code' }, { status: 403 });
  }
  await setAdminSession();
  return NextResponse.json({ admin: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ admin: false });
}
