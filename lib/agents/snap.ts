import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { chatJSON, segmentRaw, isMock, type Tracer } from "../meta";
import { parseSam } from "../sam";
import { personaContext, sourceRef } from "../persona";
import type { Card, Opportunity, SourceRef } from "../schemas";
import { snapVisionMock, SNAP_DEMO } from "../snapMocks";
import { systemPrompt } from "./prompts";

export const SnapVision = z.object({
  scene: z.string(),
  title: z.string(),
  actionLabel: z.string(),
  summary: z.string(),
  objects: z.array(z.object({ phrase: z.string(), label: z.string() })),
  lines: z.array(z.object({ label: z.string(), amount: z.string() })),
  intents: z.array(
    z.object({
      kind: z.enum(["email_reply", "task", "insight", "team_update"]),
      title: z.string(),
      why: z.string(),
      sourceIds: z.array(z.string()),
    }),
  ),
});
export type SnapVision = z.infer<typeof SnapVision>;

export interface SnapImage {
  dataUrl: string;
  width: number;
  height: number;
}

const PROMPT = [
  "Maya just snapped this photo. Read it like her chief of staff would.",
  "- scene: one short sentence describing what the photo shows.",
  '- title: the card title, ≤ 40 chars, e.g. "Log Highland Bean invoice · $678".',
  '- actionLabel: the button label for the main action, 2-3 words, e.g. "Log expense" for an invoice or receipt, "Save to notes" otherwise.',
  "- summary: 1-2 sentences on what matters in it for her business (amounts, due dates, stock levels).",
  "- objects: 2 to 4 distinct physical things worth outlining, most important first. phrase: what a segmentation model looks for, ONE plain visual noun for the category it looks like (\"paper\", \"bag\", \"sack\", \"scoop\", \"box\", \"bottle\", \"coffee beans\"), never a role or document type like \"invoice\" or \"receipt\" (the model cannot see those). label: what it is to Maya, 1-3 words, e.g. \"Invoice\", \"Green coffee sack\".",
  "- lines: if it is an invoice or receipt, its line items as printed (label, amount with currency) and the total last as label \"Total\"; otherwise [].",
  "- intents: exactly 2 follow-up actions of different kinds an agent could fully prepare now. kind; title ≤ 40 chars; why ≤ 90 chars that carries the key facts from the photo (amounts, dates, items) since the next agent will not see it; sourceIds: ids from the CONTEXT it relates to (e.g. the supplier's email), or [].",
  "  E.g. an email_reply to the supplier (confirm the invoice, the next allocation), a task to pay or reorder, a team_update about stock, an insight on costs.",
  "Cross-check the photo against the CONTEXT: if it matches an email, a note or a stock issue, say so in the summary in plain words (never write the bracketed ids in any text) and put those ids in sourceIds.",
  "Only use what is visible in the photo or written in the CONTEXT. Never invent numbers.",
].join("\n");

const MAX_PER_PHRASE = 12;
const area = (b: { x1: number; y1: number; x2: number; y2: number }) => (b.x2 - b.x1) * (b.y2 - b.y1);

/** Pick the image actually sent to the models: in mock mode the demo invoice, so recorded outlines line up. */
export function snapInput(img: SnapImage): SnapImage {
  if (!isMock()) return img;
  const file = readFileSync(path.join(process.cwd(), "public/demo/invoice.webp"));
  return { dataUrl: `data:image/webp;base64,${file.toString("base64")}`, width: SNAP_DEMO.width, height: SNAP_DEMO.height };
}

function samFixture(phrase: string): string {
  const file = path.join(process.cwd(), "tests/fixtures", `sam-${phrase.replace(/\s+/g, "-")}.txt`);
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

/** Spark vision: what is in the photo, what to outline, what to do next. */
export function readPhoto(img: SnapImage, trace: Tracer): Promise<SnapVision> {
  return chatJSON({
    step: "Snap · vision",
    name: "snap_vision",
    schema: SnapVision,
    messages: [
      { role: "system", content: systemPrompt("the Snap agent") },
      {
        role: "user",
        content: [
          { type: "text", text: `CONTEXT (ids in brackets):\n${personaContext()}\n\n${PROMPT}` },
          { type: "image_url", image_url: { url: img.dataUrl } },
        ],
      },
    ],
    mock: snapVisionMock,
    trace,
  });
}

/** Photo → Spark vision + SAM 3.1 outlines → the snap card, plus follow-ups for the Preparer. */
export async function snap(
  img: SnapImage,
  { id, trace, onStage }: { id: string; trace: Tracer; onStage?: (label: string) => void },
): Promise<{ card: Card; followUps: Opportunity[] }> {
  const vision = await readPhoto(img, trace);
  const targets = vision.objects
    .map((o) => ({ phrase: o.phrase.trim().toLowerCase(), label: o.label.trim() }))
    .filter((o, i, all) => o.phrase && all.findIndex((x) => x.phrase === o.phrase) === i)
    .slice(0, 4);
  onStage?.(`SAM 3.1 is outlining ${targets.map((t) => t.label.toLowerCase()).join(", ")}…`);
  const segmented = await Promise.all(
    targets.map(async ({ phrase, label }) => {
      try {
        const raw = await segmentRaw({
          step: `SAM 3.1 · ${phrase}`,
          imageDataUrl: img.dataUrl,
          phrase,
          mock: () => samFixture(phrase),
          trace,
        });
        // Largest instances first; a dozen outlines per concept is plenty to read.
        const found = await parseSam(raw, label);
        return found.sort((a, b) => area(b.box) - area(a.box)).slice(0, MAX_PER_PHRASE);
      } catch {
        return []; // one failed phrase never sinks the card
      }
    }),
  );

  const card: Card = {
    id,
    kind: "snap",
    title: vision.title,
    why: vision.scene,
    source: [
      { id: "photo", type: "photo", label: "Your photo" } satisfies SourceRef,
      ...[...new Set(vision.intents.flatMap((i) => i.sourceIds))].map(sourceRef).filter((s): s is SourceRef => Boolean(s)),
    ].slice(0, 3),
    urgency: 3,
    payload: {
      summary: vision.summary,
      width: img.width,
      height: img.height,
      objects: segmented.flat(),
      lines: vision.lines,
    },
    image: img.dataUrl,
    imageStatus: "ready",
    actionLabel: vision.actionLabel,
    createdAt: Date.now(),
    status: "ready",
  };
  const followUps = vision.intents.slice(0, 2).map((i) => ({ ...i, urgency: 2 as const }));
  return { card, followUps };
}
