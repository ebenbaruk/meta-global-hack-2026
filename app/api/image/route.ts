import { z } from "zod";
import { generateImage } from "@/lib/meta";
import { mockImage } from "@/lib/mocks";
import type { TraceEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ prompt: z.string().min(1).max(2000) });

/** Muse Image retry endpoint: prompt → data URL. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const traces: TraceEvent[] = [];
  try {
    const image = await generateImage({
      step: "Muse Image · retry",
      prompt: parsed.data.prompt,
      mock: () => mockImage(parsed.data.prompt),
      trace: (t) => traces.push(t),
    });
    return Response.json({ image, traces });
  } catch {
    return Response.json({ error: "Image generation failed", traces }, { status: 502 });
  }
}
