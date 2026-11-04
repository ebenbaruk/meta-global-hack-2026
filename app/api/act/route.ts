import { z } from "zod";
import { executeCard } from "@/lib/tools";
import { CardKind, PAYLOAD_SCHEMAS, type Card } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  card: z
    .object({ id: z.string().min(1), kind: CardKind, title: z.string().default(""), payload: z.unknown() })
    .passthrough()
    .superRefine((card, ctx) => {
      const result = PAYLOAD_SCHEMAS[card.kind].safeParse(card.payload);
      if (!result.success) ctx.addIssue({ code: "custom", path: ["payload"], message: `Invalid ${card.kind} payload` });
    }),
});

/** Approve → run the sandboxed tool for this card and return a receipt. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }
  const receipt = await executeCard(parsed.data.card as unknown as Card);
  return Response.json({ receipt });
}
