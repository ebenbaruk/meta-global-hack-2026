import { z } from "zod";
import { CardInput, ChatMessage, chatReply } from "@/lib/agents/chat";
import { isMock, MODELS } from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ card: CardInput, messages: z.array(ChatMessage).min(1).max(40) });

/** Dive in: streams the agent's reply as plain text deltas. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request" }, { status: 400 });
  const { card, messages } = parsed.data;

  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of chatReply(card, messages)) {
          if (cancelled) return;
          controller.enqueue(encoder.encode(delta));
        }
      } catch {
        if (cancelled) return;
        controller.enqueue(encoder.encode("\n\nI lost the connection for a second. Ask me again?"));
      }
      controller.close();
    },
    cancel() {
      cancelled = true; // the client closed the sheet mid-reply
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      // The reply is plain text, so the Agent Lens trace is built client side from these.
      "X-Model": MODELS.spark,
      "X-Model-Mode": isMock() ? "mock" : "live",
    },
  });
}
