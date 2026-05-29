import { subscribe } from '@/lib/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-Sent Events: one connection per client; any game change is broadcast
// here as a light signal, and the client re-fetches /api/state.
export async function GET() {
  const encoder = new TextEncoder();
  let unsub: (() => void) | undefined;
  let hb: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* closed */
        }
      };
      send('retry: 3000\n\n');
      send(': connected\n\n');
      send('data: {"type":"hello"}\n\n');
      unsub = subscribe(send);
      hb = setInterval(() => send(': hb\n\n'), 25000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      unsub?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
