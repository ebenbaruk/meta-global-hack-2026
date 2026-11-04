import type { FeedEvent } from "./schemas";

/** POSTs `body` and calls `onEvent` for every NDJSON line of the response, as it arrives. */
export async function streamEvents(
  url: string,
  body: unknown,
  onEvent: (event: FeedEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`${url} failed (${res.status})`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const flush = (line: string) => {
    const trimmed = line.trim();
    if (trimmed) onEvent(JSON.parse(trimmed) as FeedEvent);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      flush(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  flush(buffer);
}
