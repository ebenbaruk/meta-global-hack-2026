import type { Card, CardKind } from "./schemas";
import type { Weights } from "./taste";

/** A card that an agent is still preparing (or failed to prepare). Shown as a skeleton. */
export interface Placeholder {
  id: string;
  kind: CardKind;
  label: string;
  status: "preparing" | "error";
  error?: string;
  createdAt: number;
}
export type FeedItem = Card | Placeholder;

export const isPlaceholder = (item: FeedItem): item is Placeholder => !("payload" in item);

const HALF_LIFE_MS = 6 * 60 * 60 * 1000;
const SPONSOR_FIRST_SLOT = 3; // 4th position
const SPONSOR_EVERY = 6;
/** Scores are compared at one decimal: cards of one batch differ only by seconds of freshness, which is a tie. */
const bucket = (score: number) => Math.round(score * 10);
/** Tie-break order: the story leads with a reply, then the team, the calendar, the post. */
const KIND_PRIORITY: CardKind[] = ["email_reply", "team_update", "schedule", "social_post", "task", "insight"];
const priority = (kind: CardKind) => {
  const i = KIND_PRIORITY.indexOf(kind);
  return i < 0 ? KIND_PRIORITY.length : i;
};

/** 1.0 when fresh, halves every 6 hours, never below 0.5. */
export function freshness(ageMs: number): number {
  return Math.max(0.5, Math.pow(0.5, Math.max(0, ageMs) / HALF_LIFE_MS));
}

export function scoreCard(card: Card, weights: Weights, now: number): number {
  return card.urgency * weights[card.kind] * freshness(now - card.createdAt);
}

/**
 * Orders the feed. Placeholders keep their slot (no jumping while agents work),
 * snap cards stay pinned on top, ready cards are ranked by score, and sponsored
 * cards land at position 4, then every 6 cards. Acted cards leave the feed.
 */
export function rankFeed(items: FeedItem[], weights: Weights, now = Date.now()): FeedItem[] {
  const live = items.filter((i) => isPlaceholder(i) || i.status === "ready" || i.status === "preparing");
  const fixed = (i: FeedItem) => isPlaceholder(i) || i.status === "preparing";

  const ready = live.filter((i): i is Card => !fixed(i));
  const byNewest = (a: Card, b: Card) => b.createdAt - a.createdAt;
  const snaps = ready.filter((c) => c.kind === "snap").sort(byNewest);
  const sponsored = ready.filter((c) => c.kind === "sponsored").sort(byNewest);
  const regular = ready
    .filter((c) => c.kind !== "snap" && c.kind !== "sponsored")
    .map((card) => ({ card, score: scoreCard(card, weights, now) }))
    .sort(
      (a, b) =>
        bucket(b.score) - bucket(a.score) ||
        priority(a.card.kind) - priority(b.card.kind) ||
        b.card.createdAt - a.card.createdAt,
    )
    .map((r) => r.card);

  const ranked: Card[] = [...snaps, ...regular];
  sponsored.forEach((card, n) => {
    const slot = snaps.length + SPONSOR_FIRST_SLOT + n * SPONSOR_EVERY;
    ranked.splice(Math.min(slot, ranked.length), 0, card);
  });

  let next = 0;
  return live.map((item) => (fixed(item) ? item : ranked[next++]));
}
