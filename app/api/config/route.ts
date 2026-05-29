import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public flags the splash screen needs (e.g. whether to enable Google sign-in).
export async function GET() {
  return NextResponse.json({
    googleEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    allowedHd: process.env.ALLOWED_HD || null,
  });
}
