/** The overnight run: prepares Maya's morning feed with the real models and saves it. Run: pnpm overnight */
import { prepareOvernight } from "../lib/overnight";
import type { FeedEvent } from "../lib/schemas";

async function main() {
  if (!process.env.META_API_KEY) throw new Error("META_API_KEY missing");
  const started = Date.now();
  const log = (e: FeedEvent) => {
    if (e.type === "trace") console.log(`  ${e.trace.status === "ok" ? "✓" : "✗"} ${e.trace.step} (${e.trace.model}) ${e.trace.ms}ms`);
    if (e.type === "card") console.log(`  → ${e.card.kind}: ${e.card.title}`);
    if (e.type === "card_error" || e.type === "image_error") console.log(`  ✗ ${e.type}: ${e.message}`);
  };
  const saved = await prepareOvernight(log);
  console.log(saved ? `Saved the morning feed in ${((Date.now() - started) / 1000).toFixed(1)} s.` : "Run had errors, nothing saved.");
  if (!saved) process.exitCode = 1;
}

void main();
