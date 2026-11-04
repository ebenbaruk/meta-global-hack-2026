/** Live smoke: one real call per Meta model. Run: pnpm smoke */
import { z } from "zod";
import { chatJSON, generateImage, segmentRaw, MODELS, type Tracer } from "../lib/meta";
import { parseSam } from "../lib/sam";

const trace: Tracer = (t) => console.log(`  ${t.status === "ok" ? "✓" : "✗"} ${t.step} (${t.model}) ${t.ms}ms ${t.detail ?? ""}`);
const fail = (m: string) => { throw new Error(m); };

async function main() {
  if (!process.env.META_API_KEY) fail("META_API_KEY missing");
  const json = await chatJSON({
    step: "smoke · spark json", name: "smoke", trace,
    schema: z.object({ greeting: z.string(), items: z.array(z.object({ n: z.number(), word: z.string() })) }),
    messages: [{ role: "user", content: "Say hi and list 2 numbered coffee words." }],
    mock: () => fail("mock"),
  });
  console.log("  spark →", JSON.stringify(json));

  const img = await generateImage({ step: "smoke · image", prompt: "A minimal flat illustration of a coffee bag", trace, mock: () => fail("mock") });
  console.log("  image →", img.slice(0, 40), `${Math.round(img.length / 1024)}KB`);

  const raw = await segmentRaw({ step: "smoke · sam", imageDataUrl: img, phrase: "bag", trace, mock: () => fail("mock") });
  const objs = await parseSam(raw, "bag");
  console.log("  sam →", objs.length, "objects", objs[0] ? JSON.stringify(objs[0].box) + " path " + objs[0].svgPath.length + " chars" : "");
  if (!objs.length) fail("SAM found nothing");
  console.log("\nSMOKE OK —", Object.values(MODELS).join(", "));
}
main().catch((e) => { console.error("SMOKE FAILED", e); process.exit(1); });
