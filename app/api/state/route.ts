import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/session';
import { snapshot } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const id = await getUserId();
  return NextResponse.json(snapshot(id));
}
