import { z } from "zod";
import { CardInput, revisePayload } from "@/lib/agents/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ card: CardInput, instruction: z.string().trim().min(1).max(500) });

/** Rewrites a card's payload following one instruction ("Make it shorter"). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid revise request" }, { status: 400 });
  try {
    const payload = await revisePayload(parsed.data.card, parsed.data.instruction);
    return Response.json({ payload });
  } catch {
    return Response.json({ error: "Couldn't revise the draft" }, { status: 502 });
  }
}
