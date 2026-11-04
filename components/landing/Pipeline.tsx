"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { BrandImage } from "./bits";
import { Eyebrow, Headline, Reveal, SPRING } from "./motion";

const STAGES = [
  {
    n: "01",
    name: "Miner",
    tone: "bg-sky",
    line: "Reads the inbox, calendar, sales and notes. Finds the five things worth doing today.",
    spec: "muse-spark-1.3 · strict json_schema",
  },
  {
    n: "02",
    name: "Preparers",
    tone: "bg-mint",
    line: "Five agents in parallel, each doing the whole job: the draft, the numbers, the slot, the visual.",
    spec: "5 calls in parallel · zod per card kind",
  },
  {
    n: "03",
    name: "Ranker",
    tone: "bg-yellow",
    line: "Urgency × your taste × freshness. Runs on your phone and re-ranks after every swipe.",
    spec: "client side · learns from gestures",
  },
  {
    n: "04",
    name: "Executor",
    tone: "bg-rose",
    line: "Approve runs the action: send, post, book, log. A receipt lands in the outbox.",
    spec: "sandboxed tools · optimistic ui",
  },
] as const;

const LANES = ["Drafting reply to Lena…", "Pulling yesterday's sales…", "Finding a free Thursday slot…", "Writing the launch post…", "Breaking a task into steps…"];

/** Five parallel lanes that fill one after another, like Preparers finishing. */
function Lanes() {
  return (
    <div className="mt-4 space-y-1.5">
      {LANES.map((l, i) => (
        <div key={l} className="relative h-6 overflow-hidden rounded-full bg-elevated">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-mint"
            initial={{ width: "8%" }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 1.1 + ((i * 37) % 5) * 0.25, delay: 0.5 + i * 0.12, ease: [0.3, 0.7, 0.2, 1] }}
          />
          <span className="typed absolute inset-0 flex items-center truncate px-3 text-[9px] text-onpastel">{l}</span>
        </div>
      ))}
    </div>
  );
}

const SOURCES = ["inbox · 15 emails", "calendar · 14 events", "sales · 14 days", "notes.md"];
const RANKED = [
  ["Reply to Lena", "3.0"],
  ["Thursday clash", "2.6"],
  ["Web sales update", "1.9"],
];
const TOOLS = ["send_email", "post_message", "create_event", "publish_post"];

/** What each stage looks like at work, under its description. */
function StageVisual({ name }: { name: string }) {
  const item = (i: number) => ({
    initial: { opacity: 0, x: -10 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, amount: 0.8 },
    transition: { ...SPRING, delay: 0.4 + i * 0.1 },
  });
  if (name === "Preparers") return <Lanes />;
  if (name === "Miner")
    return (
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {SOURCES.map((s, i) => (
          <motion.li key={s} {...item(i)} className="typed rounded-full border border-line bg-elevated px-2.5 py-1 text-[9px] text-ink">
            {s}
          </motion.li>
        ))}
      </ul>
    );
  if (name === "Ranker")
    return (
      <ol className="mt-4 space-y-1.5">
        {RANKED.map(([t, score], i) => (
          <motion.li key={t} {...item(i)} className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-1.5 text-[13px] text-ink">
            <span className="typed text-[9px] text-faint">{i + 1}</span>
            <span className="flex-1 truncate">{t}</span>
            <span className="typed text-[10px] font-bold text-lilac-ink">{score}</span>
          </motion.li>
        ))}
      </ol>
    );
  return (
    <ul className="mt-4 space-y-1.5">
      {TOOLS.map((t, i) => (
        <motion.li key={t} {...item(i)} className="typed flex items-center gap-2 text-[10px] text-ink">
          <span className="grid size-4 place-items-center rounded-full border border-onpastel bg-mint text-[9px] text-onpastel">✓</span>
          {t}()
        </motion.li>
      ))}
    </ul>
  );
}

/** A connector arrow between stages that draws itself when it scrolls in. */
function Connector({ i }: { i: number }) {
  return (
    <div aria-hidden className="flex items-center justify-center py-1 lg:px-1 lg:py-0">
      <svg viewBox="0 0 40 40" className="size-9 rotate-90 text-ink lg:rotate-0">
        <motion.path
          d="M4 20 H32 M24 11 L33 20 L24 29"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.25 }}
        />
      </svg>
    </div>
  );
}

export function Pipeline() {
  return (
    <section id="how" className="mx-auto max-w-[1360px] scroll-mt-8 px-4 py-24 sm:px-8 lg:py-36">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <Eyebrow>03 · How it works</Eyebrow>
          <Headline
            text={"Four agents.\nOne feed."}
            mark="feed."
            className="mt-5 text-[clamp(52px,13vw,72px)] lg:text-[clamp(72px,7vw,112px)]"
          />
          <Reveal>
            <p className="mt-6 max-w-[36rem] text-[18px] leading-relaxed text-muted sm:text-[19px]">
              While Maya sleeps, a real multi-agent pipeline turns her raw context into finished work. Cards stream in one
              by one as soon as each is ready.
            </p>
          </Reveal>
        </div>
        <Reveal className="hidden lg:block">
          <BrandImage name="mascot-scan.webp" alt="Ford reading through envelopes with a magnifying glass" outlined className="w-48" />
        </Reveal>
      </div>

      <div className="mt-14 grid lg:grid-cols-[1fr_auto_1.15fr_auto_1fr_auto_1fr]">
        {STAGES.map((s, i) => (
          <div key={s.name} className="contents">
            <motion.article
              initial={{ opacity: 0, y: 40, rotate: i % 2 ? 2 : -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ ...SPRING, delay: i * 0.12 }}
              className="flex flex-col rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full border-[1.5px] border-onpastel font-display text-[18px] font-black text-onpastel",
                    s.tone,
                  )}
                >
                  {s.n}
                </span>
                {s.name === "Preparers" && <span className="typed text-[10px] font-bold text-faint">× 5</span>}
              </div>
              <h3 className="mt-5 font-display text-[32px] leading-none font-black text-ink">{s.name}</h3>
              <p className="mt-3 text-[15px] leading-snug text-muted">{s.line}</p>
              <StageVisual name={s.name} />
              <div className="min-h-5 flex-1" />
              <p className="typed border-t border-dashed border-line pt-3 text-[10px] text-lilac-ink">
                {s.spec}
              </p>
            </motion.article>
            {i < STAGES.length - 1 && <Connector i={i} />}
          </div>
        ))}
      </div>
    </section>
  );
}
