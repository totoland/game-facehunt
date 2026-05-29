// Tiny in-process pub/sub for Server-Sent Events.
// Single Next.js process → one bus reaches every connected client.

type Sink = (chunk: string) => void;

const g = globalThis as unknown as { __fhBus?: Set<Sink> };
const sinks: Set<Sink> = g.__fhBus ?? (g.__fhBus = new Set());

export function subscribe(sink: Sink): () => void {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

/**
 * Broadcast a change to every connected client.
 * Payload is intentionally light — clients re-fetch /api/state on any event.
 */
export function publish(type: string, data: Record<string, unknown> = {}) {
  const line = `data: ${JSON.stringify({ type, t: Date.now(), ...data })}\n\n`;
  for (const sink of sinks) {
    try {
      sink(line);
    } catch {
      sinks.delete(sink);
    }
  }
}

export function clientCount() {
  return sinks.size;
}
