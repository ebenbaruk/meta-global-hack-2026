import { describe, expect, it } from "vitest";
import { freshness, isPlaceholder, rankFeed, type FeedItem, type Placeholder } from "@/lib/ranker";
import { applyVerdict, initialWeights, tunedMessage, WEIGHT_MAX, WEIGHT_MIN } from "@/lib/taste";
import type { Card, CardKind } from "@/lib/schemas";

const NOW = 1_800_000_000_000;

function card(id: string, kind: CardKind, urgency: 1 | 2 | 3, ageMin = 0): Card {
  return {
    id,
    kind,
    urgency,
    title: id,
    why: "",
    source: [],
    payload: { steps: [] },
    actionLabel: "Do it",
    createdAt: NOW - ageMin * 60_000,
    status: "ready",
  } as unknown as Card;
}
const placeholder = (id: string, kind: CardKind = "task"): Placeholder => ({
  id,
  kind,
  label: "Preparing…",
  status: "preparing",
  createdAt: NOW,
});
const ids = (items: FeedItem[]) => items.map((i) => i.id);

describe("taste", () => {
  it("starts every kind at 1.0", () => {
    expect(Object.values(initialWeights()).every((w) => w === 1)).toBe(true);
  });

  it("approve, dismiss and edit move the weight of that kind only", () => {
    const w = initialWeights();
    expect(applyVerdict(w, "email_reply", "approve").email_reply).toBe(1.15);
    expect(applyVerdict(w, "team_update", "dismiss").team_update).toBe(0.75);
    expect(applyVerdict(w, "task", "edit").task).toBe(1.05);
    expect(applyVerdict(w, "task", "edit").email_reply).toBe(1);
    expect(w.task).toBe(1); // pure
  });

  it("clamps between the floor and the cap", () => {
    let w = initialWeights();
    for (let i = 0; i < 10; i++) w = applyVerdict(w, "insight", "dismiss");
    expect(w.insight).toBe(WEIGHT_MIN);
    for (let i = 0; i < 20; i++) w = applyVerdict(w, "insight", "approve");
    expect(w.insight).toBe(WEIGHT_MAX);
  });

  it("writes a human tuned message", () => {
    expect(tunedMessage("team_update", "dismiss")).toBe("Tuned: fewer team updates");
    expect(tunedMessage("email_reply", "approve")).toBe("Tuned: more email replies");
  });
});

describe("ranker", () => {
  it("decays freshness by age, with a floor", () => {
    expect(freshness(0)).toBe(1);
    expect(freshness(6 * 3600_000)).toBeCloseTo(0.5);
    expect(freshness(48 * 3600_000)).toBe(0.5);
  });

  it("ranks by urgency × weight", () => {
    const w = initialWeights();
    const items = [card("low", "task", 1), card("high", "email_reply", 3), card("mid", "insight", 2)];
    expect(ids(rankFeed(items, w, NOW))).toEqual(["high", "mid", "low"]);

    const tuned = { ...w, email_reply: 0.2 };
    expect(ids(rankFeed(items, tuned, NOW))).toEqual(["mid", "low", "high"]);
  });

  it("keeps placeholders in their slot", () => {
    const items = [card("a", "task", 1), placeholder("p1"), card("b", "task", 3), placeholder("p2")];
    const ranked = rankFeed(items, initialWeights(), NOW);
    expect(ids(ranked)).toEqual(["b", "p1", "a", "p2"]);
    expect(isPlaceholder(ranked[1])).toBe(true);
  });

  it("inserts the sponsored card at position 4", () => {
    const items = [
      card("s", "sponsored", 3),
      ...[1, 2, 3, 4, 5].map((n) => card(`c${n}`, "task", 2, n)),
    ];
    expect(ids(rankFeed(items, initialWeights(), NOW))).toEqual(["c1", "c2", "c3", "s", "c4", "c5"]);
  });

  it("pins snap cards on top and drops acted cards", () => {
    const done = { ...card("gone", "email_reply", 3), status: "done" } as Card;
    const items = [card("c1", "email_reply", 3), done, card("snap", "snap", 1)];
    expect(ids(rankFeed(items, initialWeights(), NOW))).toEqual(["snap", "c1"]);
  });
});
