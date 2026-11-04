"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Eyebrow, Headline, Reveal, SPRING } from "./motion";

/** Shapes of the real /api/feed NDJSON events (lib/ndjson.ts, app/api/feed/route.ts). */
const LOG = [
  ["0.0s", '{"type":"skeleton","kind":"email_reply","label":"Reading your inbox…"}'],
  ["0.0s", '{"type":"skeleton","kind":"team_update","label":"Pulling 14 days of sales…"}'],
  ["12.8s", '{"type":"trace","trace":{"step":"Miner","model":"muse-spark-1.3","ms":12790,"status":"ok"}}'],
  ["12.8s", '{"type":"skeleton","kind":"email_reply","label":"Drafting reply to Lena…"}'],
  ["21.4s", '{"type":"card","card":{"kind":"email_reply","title":"Reply to Lena at Bloom Café"}}'],
  ["24.9s", '{"type":"card","card":{"kind":"team_update","title":"Web sales +33.4% …"}}'],
  ["36.2s", '{"type":"image","id":"social_post","image":"data:image/webp;base64,…"}'],
  ["37.0s", '{"type":"done"}'],
] as const;

const FACTS = [
  { t: "Streams, never spins", d: "/api/feed answers in NDJSON. Skeletons appear at 0 s with live labels; each card lands the moment its agent finishes." },
  { t: "Strict JSON, checked twice", d: "Every model output is constrained by a json_schema generated from zod, then parsed by that same zod schema." },
  { t: "Numbers come from code", d: "Sales deltas and free calendar slots are computed, not guessed. If the model picks a busy slot, code swaps in a free one." },
  { t: "Fails small", d: "30 s timeout and one retry per call. A failed card becomes a retry button, a failed image keeps its card." },
  { t: "Mock mode", d: "META_MOCK=1 replays recorded fixtures, raw SAM output included. The e2e suite runs on it; the demo can too." },
  { t: "Tested", d: "Vitest for ranking, taste math, SAM parsing and schemas. Playwright for six full flows, approve to snap." },
] as const;

export function BuiltRight() {
  return (
    <section id="built" className="mx-auto max-w-[1360px] scroll-mt-8 px-4 py-24 sm:px-8 lg:py-36">
      <Eyebrow>07 · Under the hood</Eyebrow>
      <Headline
        text={"Honest, and\nbuilt right."}
        mark="right."
        className="mt-5 text-[clamp(52px,13vw,72px)] lg:text-[clamp(72px,7vw,112px)]"
      />
      <Reveal>
        <p className="mt-6 max-w-[38rem] text-[18px] leading-relaxed text-muted sm:text-[19px]">
          Nothing is hardcoded. Every card is generated live from Maya&apos;s sandbox, and the Agent Lens shows each model call
          as it happens.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <Reveal className="min-w-0">
          <div className="overflow-hidden rounded-card border-[1.5px] border-line-strong bg-surface shadow-pop">
            <div className="flex items-center gap-2 border-b border-line bg-elevated px-5 py-3">
              <span className="size-3 rounded-full border border-onpastel bg-rose" />
              <span className="size-3 rounded-full border border-onpastel bg-yellow" />
              <span className="size-3 rounded-full border border-onpastel bg-mint" />
              <span className="typed ml-3 truncate text-[10px] text-muted">POST /api/feed · application/x-ndjson</span>
            </div>
            <ol className="space-y-2.5 p-5 font-mono text-[11.5px] leading-relaxed sm:p-6 sm:text-[12.5px]">
              {LOG.map(([t, line], i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.22 }}
                  className="flex gap-4"
                >
                  <span className="w-11 shrink-0 text-right text-faint">{t}</span>
                  <span className={cn("min-w-0 break-all", line.includes('"card"') ? "text-lilac-ink" : "text-ink")}>{line}</span>
                </motion.li>
              ))}
              <li className="flex gap-4">
                <span className="w-11 shrink-0" />
                <span className="inline-block h-4 w-2 animate-pulse bg-lilac" />
              </li>
            </ol>
          </div>
          <p className="typed mt-3 text-[10px] text-faint">Timings from a live run: first card ≈ 21 s, all cards ≈ 28 s, image ≈ 34–44 s.</p>
        </Reveal>

        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {FACTS.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ ...SPRING, delay: (i % 2) * 0.08 }}
              className="border-t-[1.5px] border-line-strong pt-4"
            >
              <h3 className="font-display text-[22px] leading-tight font-bold text-ink">{f.t}</h3>
              <p className="mt-2 text-[15px] leading-snug text-muted">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
