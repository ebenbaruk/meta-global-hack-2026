import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Card, FeedEvent } from "@/lib/schemas";

const card = (id: string, kind: Card["kind"]) => ({ id, kind, title: `t-${id}` }) as unknown as Card;
const trace = { id: "t1", step: "Miner", model: "muse-spark-1.3", ms: 10, status: "ok" as const, at: 1 };

let runs = 0;
let script: FeedEvent[] = [];
vi.mock("@/lib/pipeline", () => ({
  runFeed: async (_: unknown, send: (e: FeedEvent) => void) => {
    runs++;
    script.forEach(send);
  },
}));
vi.mock("@/lib/meta", () => ({ sleep: async () => {} }));

const dir = mkdtempSync(path.join(tmpdir(), "ff-overnight-"));
vi.spyOn(process, "cwd").mockReturnValue(dir);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const collect = async (fn: (send: (e: FeedEvent) => void) => Promise<void>) => {
  const out: FeedEvent[] = [];
  await fn((e) => out.push(e));
  return out;
};

describe("overnight run", () => {
  it("does not save a run with errors", async () => {
    const { prepareOvernight } = await import("@/lib/overnight");
    script = [{ type: "card", card: card("a", "task") }, { type: "card_error", id: "b", message: "x" }, { type: "done" }];
    expect(await prepareOvernight()).toBeNull();
  });

  it("runs live once, then replays instantly with fresh ids and a prepared marker", async () => {
    const { overnightFeed } = await import("@/lib/overnight");
    script = [
      { type: "trace", trace },
      { type: "skeleton", id: "a", kind: "task", label: "…" },
      { type: "card", card: card("a", "task") },
      { type: "card", card: card("b", "email_reply") },
      { type: "card", card: card("c", "social_post") },
      { type: "image", id: "c", image: "data:image/webp;base64,AAAA" },
      { type: "done" },
    ];
    runs = 0;
    const live = await collect(overnightFeed);
    expect(runs).toBe(1);
    expect(live).toEqual(script); // the first visit streams the live run as is

    const replay = await collect(overnightFeed);
    expect(runs).toBe(1); // no new model calls
    expect(replay[0]).toMatchObject({ type: "prepared" });
    expect(replay.some((e) => e.type === "skeleton")).toBe(false);
    expect(replay.at(-1)).toEqual({ type: "done" });
    const cards = replay.flatMap((e) => (e.type === "card" ? [e.card] : []));
    expect(cards.map((c) => c.title)).toEqual(["t-a", "t-b", "t-c"]);
    expect(cards.every((c) => !["a", "b", "c"].includes(c.id))).toBe(true);
    const image = replay.find((e) => e.type === "image");
    expect(image && image.type === "image" && image.id).toBe(cards[2].id); // image still matches its card
  });
});
