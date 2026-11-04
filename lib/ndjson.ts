/**
 * A tiny NDJSON stream: `run` gets a `send` that writes one JSON line per call.
 * The stream closes when `run` resolves (or after writing a final error line).
 */
export function ndjsonResponse<T>(run: (send: (event: T) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: T) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false; // client went away
        }
      };
      try {
        await run(send);
      } catch (err) {
        console.error("ndjson stream failed", err);
      } finally {
        if (open) controller.close();
        open = false;
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
