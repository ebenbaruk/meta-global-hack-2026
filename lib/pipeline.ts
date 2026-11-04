import "server-only";
import { generateImage, type Tracer } from "@/lib/meta";
import { mine } from "@/lib/agents/miner";
import { prepare, skeletonLabel } from "@/lib/agents/preparer";
import { pickSponsor } from "@/lib/agents/sponsor";
import { mockImage } from "@/lib/mocks";
import type { Card, CardKind, FeedEvent } from "@/lib/schemas";

const SCAN_STEPS: { kind: CardKind; label: string }[] = [
  { kind: "email_reply", label: "Reading your inbox…" },
  { kind: "team_update", label: "Pulling 14 days of sales…" },
  { kind: "schedule", label: "Scanning this week's calendar…" },
  { kind: "social_post", label: "Checking Friday's launch notes…" },
  { kind: "task", label: "Looking for decisions due today…" },
];

const SPONSOR_AFTER = 3; // the sponsored card goes out right after the 3rd card

export interface FeedRequest {
  notes: string[];
  seenTitles: string[];
  batch: number;
}

/** One feed run: Miner → parallel Preparers (+ sponsor, + image), streamed as FeedEvents. */
export async function runFeed({ notes, seenTitles, batch }: FeedRequest, send: (e: FeedEvent) => void): Promise<void> {
  const trace: Tracer = (t) => send({ type: "trace", trace: t });
  const background: Promise<unknown>[] = [];

  // Start the sponsor match right away so it is ready by the 3rd card.
  const sponsorId = newId();
  const sponsorCard = pickSponsor({ id: sponsorId, batch, excludeBrands: seenTitles, trace }).catch(() => undefined);
  let sponsorSent = false;
  const sendSponsor = async () => {
    if (sponsorSent) return;
    sponsorSent = true;
    const card = await sponsorCard;
    send(card ? { type: "card", card } : { type: "card_error", id: sponsorId, message: "No offer right now" });
  };

  // Skeletons go out immediately while the Miner reads, then get renamed once it knows what it found.
  const scanning = SCAN_STEPS.map((step) => ({ ...step, id: newId() }));
  for (const s of scanning) send({ type: "skeleton", id: s.id, kind: s.kind, label: s.label });

  let opportunities;
  try {
    opportunities = await mine({ notes, seenTitles, batch, trace });
  } catch (err) {
    for (const s of scanning) send({ type: "drop", id: s.id });
    send({ type: "card_error", id: "miner", message: errorMessage(err) });
    send({ type: "done" });
    return;
  }
  for (const s of scanning.slice(opportunities.length)) send({ type: "drop", id: s.id });
  if (!opportunities.length) {
    send({ type: "done" }); // nothing new: the client shows its caught-up state
    return;
  }

  const jobs = opportunities.map((o, i) => ({ o, id: scanning[i]?.id ?? newId() }));
  for (const { o, id } of jobs) send({ type: "skeleton", id, kind: o.kind, label: skeletonLabel(o) });
  send({ type: "skeleton", id: sponsorId, kind: "sponsored", label: "Finding a relevant offer…" });

  let cardsSent = 0;
  await Promise.all(
    jobs.map(async ({ o, id }) => {
      let card: Card;
      try {
        card = await prepare(o, { id, trace });
      } catch (err) {
        send({ type: "card_error", id, message: errorMessage(err) });
        return;
      }
      send({ type: "card", card });
      if (card.kind === "social_post") background.push(renderImage(card.id, card.payload.imagePrompt, trace, send));
      if (++cardsSent === SPONSOR_AFTER) await sendSponsor();
    }),
  );
  await sendSponsor(); // fewer than 3 cards made it: still fill (or clear) the sponsored slot

  await Promise.all(background);
  send({ type: "done" });
}

async function renderImage(id: string, prompt: string, trace: Tracer, send: (e: FeedEvent) => void) {
  try {
    const image = await generateImage({ step: "Muse Image · launch post", prompt, mock: () => mockImage(prompt), trace });
    send({ type: "image", id, image });
  } catch (err) {
    send({ type: "image_error", id, message: errorMessage(err) });
  }
}

const newId = () => Math.random().toString(36).slice(2, 10);

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message.slice(0, 120) : "Something went wrong";
}
