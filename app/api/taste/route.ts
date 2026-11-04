import { z } from "zod";
import { learnTaste } from "@/lib/agents/taste";
import { CardKind, type TraceEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  history: z.array(
    z.object({
      cardId: z.string(),
      kind: CardKind,
      title: z.string(),
      verdict: z.enum(["approve", "dismiss", "edit"]),
    }),
  ),
});

/** Gestures → ≤ 5 preference notes that steer the next Miner run. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const traces: TraceEvent[] = [];
  try {
    const notes = await learnTaste({ history: parsed.data.history, trace: (t) => traces.push(t) });
    return Response.json({ notes, traces });
  } catch {
    return Response.json({ error: "Taste update failed", traces }, { status: 502 });
  }
}
