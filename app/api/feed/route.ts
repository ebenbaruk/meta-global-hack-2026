import { z } from "zod";
import { isMock } from "@/lib/meta";
import { ndjsonResponse } from "@/lib/ndjson";
import { overnightFeed } from "@/lib/overnight";
import { runFeed } from "@/lib/pipeline";
import type { FeedEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  notes: z.array(z.string()).default([]),
  seenTitles: z.array(z.string()).default([]),
  batch: z.number().int().min(1).default(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const input = parsed.data;

  // The morning feed (first batch, nothing learned yet) is the one the agents prepare overnight.
  const morning = input.batch === 1 && !input.notes.length && !input.seenTitles.length && !isMock();
  return ndjsonResponse<FeedEvent>((send) => (morning ? overnightFeed(send) : runFeed(input, send)));
}
