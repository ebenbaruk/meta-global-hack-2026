import { z } from "zod";
import type { Tracer } from "@/lib/meta";
import { prepare, skeletonLabel } from "@/lib/agents/preparer";
import { snap, snapInput } from "@/lib/agents/snap";
import { ndjsonResponse } from "@/lib/ndjson";
import type { FeedEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_CHARS = 4 * 1024 * 1024 * 1.37; // ~4 MB once base64-encoded

const Body = z.object({
  image: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, "Expected a png, jpeg or webp data URL")
    .max(MAX_IMAGE_CHARS, "Image too large (max ~4 MB)"),
  width: z.number().int().min(16).max(4096),
  height: z.number().int().min(16).max(4096),
});

/** Photo → snap card (vision + SAM outlines) → follow-up cards from what the photo implies. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }
  const img = snapInput({ dataUrl: parsed.data.image, width: parsed.data.width, height: parsed.data.height });

  return ndjsonResponse<FeedEvent>(async (send) => {
    const trace: Tracer = (t) => send({ type: "trace", trace: t });
    const snapId = newId();
    send({ type: "skeleton", id: snapId, kind: "snap", label: "Reading your photo…" });

    let followUps;
    try {
      const result = await snap(img, { id: snapId, trace });
      send({ type: "card", card: result.card });
      followUps = result.followUps;
    } catch (err) {
      send({ type: "card_error", id: snapId, message: errorMessage(err) });
      send({ type: "done" });
      return;
    }

    const jobs = followUps.map((o) => ({ o, id: newId() }));
    for (const { o, id } of jobs) send({ type: "skeleton", id, kind: o.kind, label: skeletonLabel(o) });
    await Promise.all(
      jobs.map(async ({ o, id }) => {
        try {
          send({ type: "card", card: await prepare(o, { id, trace }) });
        } catch (err) {
          send({ type: "card_error", id, message: errorMessage(err) });
        }
      }),
    );
    send({ type: "done" });
  });
}

const newId = () => Math.random().toString(36).slice(2, 10);

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message.slice(0, 120) : "Something went wrong";
}
