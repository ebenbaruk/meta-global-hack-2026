import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sleep } from "@/lib/meta";
import { runFeed } from "@/lib/pipeline";
import type { FeedEvent } from "@/lib/schemas";

/**
 * The overnight run. The morning feed is prepared ahead of time by a real pipeline run
 * (`pnpm overnight`, or the first live visit), saved, and replayed instantly when Maya opens the app.
 * Later batches, Snap and Dive in stay fully live.
 */

const FILE = path.join(process.cwd(), ".cache", "overnight.json");
const MAX_AGE_MS = 24 * 3600_000;
const CARD_GAP_MS = 140; // replay cadence, so cards still materialize one by one

interface Recording {
  preparedAt: number;
  events: FeedEvent[];
}

let memory: Recording | null = null;

async function load(): Promise<Recording | null> {
  if (!memory) {
    try {
      memory = JSON.parse(await readFile(FILE, "utf8")) as Recording;
    } catch {
      return null;
    }
  }
  return Date.now() - memory.preparedAt < MAX_AGE_MS ? memory : null;
}

/** Runs the real pipeline, streaming to `send` if given, and saves the run when it is clean. */
export async function prepareOvernight(send: (e: FeedEvent) => void = () => {}): Promise<Recording | null> {
  const preparedAt = Date.now();
  const events: FeedEvent[] = [];
  await runFeed({ notes: [], seenTitles: [], batch: 1 }, (e) => {
    events.push(e);
    send(e);
  });
  const cards = events.filter((e) => e.type === "card").length;
  const failed = events.some((e) => e.type === "card_error" || e.type === "image_error");
  if (failed || cards < 3) return null;

  const recording: Recording = {
    preparedAt,
    // Skeletons and drops only made sense while the agents were working.
    events: events.filter((e) => e.type !== "skeleton" && e.type !== "drop" && e.type !== "done"),
  };
  memory = recording;
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(recording));
  return recording;
}

/** Streams the morning feed: replays the overnight run if there is one, else runs live and saves it. */
export async function overnightFeed(send: (e: FeedEvent) => void): Promise<void> {
  const recording = await load();
  if (!recording) {
    await prepareOvernight(send);
    return;
  }
  // Fresh ids on every replay, so a replay never collides with cards already in a client's store.
  const ids = new Map<string, string>();
  const fresh = (id: string) => ids.get(id) ?? ids.set(id, `${id}-${Date.now().toString(36)}`).get(id)!;
  send({ type: "prepared", at: recording.preparedAt });
  for (const e of recording.events) {
    if (e.type === "card") {
      await sleep(CARD_GAP_MS);
      send({ ...e, card: { ...e.card, id: fresh(e.card.id) } });
    } else if (e.type === "image") send({ ...e, id: fresh(e.id) });
    else if (e.type === "trace") send({ ...e, trace: { ...e.trace, id: fresh(e.trace.id) } });
    else send(e);
  }
  send({ type: "done" });
}
