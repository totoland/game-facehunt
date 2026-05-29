import { NextResponse } from 'next/server';
import { readPhoto } from '@/lib/photos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rel = (path || []).join('/');
  const file = readPhoto(rel);
  if (!file) return new NextResponse('not found', { status: 404 });
  return new NextResponse(new Uint8Array(file.buf), {
    headers: { 'Content-Type': file.mime, 'Cache-Control': 'private, max-age=3600' },
  });
}
