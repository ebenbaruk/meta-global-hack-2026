"use client";

import { AnimatePresence, motion, useMotionValue, useScroll, useTransform, type PanInfo } from "framer-motion";
import { Check, MessageCircle, Pencil, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MiniCard, type KindTone } from "./bits";
import { Eyebrow, Headline, Reveal, SPRING } from "./motion";

/** Same math as lib/taste.ts: approve +0.15, dismiss −0.25, clamped to [0.2, 2.5]. */
const DELTA = { approve: 0.15, dismiss: -0.25 } as const;

const DECK: { key: string; tone: KindTone; kind: string; title: string; body: string; action: string; plural: string }[] = [
  { key: "email", tone: "email", kind: "Email", title: "Reply to Lena at Bloom Café", body: "Pricing, delivery days and terms, in Maya's voice.", action: "Send reply", plural: "email replies" },
  { key: "team", tone: "team", kind: "Team update", title: "Web sales +33.4% yesterday", body: "Post the numbers to the team channel.", action: "Post update", plural: "team updates" },
  { key: "social", tone: "social", kind: "Social", title: "Launch post for Guji Natural", body: "Caption written, visual by Muse Image.", action: "Schedule post", plural: "social posts" },
  { key: "schedule", tone: "schedule", kind: "Schedule", title: "Thursday 10:00 is double-booked", body: "A free slot, with 30 min to cross town.", action: "Propose slot", plural: "scheduling fixes" },
];

const GESTURES = [
  { icon: Check, name: "Approve", tone: "bg-yellow", line: "The agent executes. Sent, posted, booked, logged." },
  { icon: Pencil, name: "Edit", tone: "bg-sky", line: "Tweak the draft in a sheet, then approve." },
  { icon: X, name: "Dismiss", tone: "bg-rose", line: "Not today. The feed learns from that too." },
  { icon: MessageCircle, name: "Dive in", tone: "bg-lilac", line: "A chat that already knows the card and its sources." },
] as const;

/** Huge words sliding in opposite directions as you scroll past. */
function ScrollBand() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const left = useTransform(scrollYProgress, [0, 1], ["5%", "-35%"]);
  const right = useTransform(scrollYProgress, [0, 1], ["-40%", "0%"]);
  const row = "Approve ✺ Edit ✺ Dismiss ✺ Dive in ✺ Approve ✺ Edit ✺";
  return (
    <div ref={ref} aria-hidden className="overflow-hidden py-6 select-none">
      <motion.p style={{ x: left }} className="font-display text-[clamp(64px,13vw,200px)] leading-[0.95] font-black whitespace-nowrap text-ink">
        {row}
      </motion.p>
      <motion.p
        style={{ x: right }}
        className="font-display text-[clamp(64px,13vw,200px)] leading-[0.95] font-black whitespace-nowrap text-transparent [-webkit-text-stroke:2px_var(--ink)]"
      >
        {row}
      </motion.p>
    </div>
  );
}

type Verdict = keyof typeof DELTA;

/** The top card of the demo deck: drag past 110px to approve or dismiss. */
function SwipeCard({ card, onAct }: { card: (typeof DECK)[number]; onAct: (v: Verdict) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const approveO = useTransform(x, [20, 110], [0, 1]);
  const dismissO = useTransform(x, [-110, -20], [1, 0]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110) onAct("approve");
    else if (info.offset.x < -110) onAct("dismiss");
  };
  return (
    <motion.div
      drag="x"
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      style={{ x, rotate }}
      initial={{ scale: 0.95, y: 12, opacity: 0.7 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      variants={{
        out: (v: Verdict) => ({ x: v === "approve" ? 420 : -420, rotate: v === "approve" ? 18 : -18, opacity: 0, transition: { duration: 0.35 } }),
      }}
      exit="out"
      transition={SPRING}
      className="absolute inset-x-0 top-0 cursor-grab touch-pan-y active:cursor-grabbing"
    >
      <MiniCard tone={card.tone} kind={card.kind} title={card.title} action={card.action}>
        {card.body}
      </MiniCard>
      <motion.span
        style={{ opacity: approveO }}
        className="typed pointer-events-none absolute top-6 right-5 rotate-[10deg] rounded-full border-[1.5px] border-onpastel bg-mint px-3 py-1.5 font-bold text-onpastel"
      >
        Done ✓
      </motion.span>
      <motion.span
        style={{ opacity: dismissO }}
        className="typed pointer-events-none absolute top-6 left-5 rotate-[-10deg] rounded-full border-[1.5px] border-onpastel bg-rose px-3 py-1.5 font-bold text-onpastel"
      >
        Not today
      </motion.span>
    </motion.div>
  );
}

export function Gestures() {
  const [top, setTop] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>(() => Object.fromEntries(DECK.map((d) => [d.key, 1])));
  const [toast, setToast] = useState<{ id: number; text: string; verdict: Verdict } | null>(null);
  const [exit, setExit] = useState<Verdict>("approve");

  const card = DECK[top % DECK.length];
  const next = DECK[(top + 1) % DECK.length];

  const act = (verdict: Verdict) => {
    setExit(verdict);
    setWeights((w) => ({ ...w, [card.key]: Math.round(Math.min(2.5, Math.max(0.2, w[card.key] + DELTA[verdict])) * 100) / 100 }));
    setToast({ id: Date.now(), verdict, text: `Tuned: ${verdict === "dismiss" ? "fewer" : "more"} ${card.plural}` });
    setTop((t) => t + 1);
  };

  return (
    <section id="gestures" className="py-24 lg:py-32">
      <ScrollBand />

      <div className="mx-auto mt-16 grid max-w-[1360px] gap-16 px-4 sm:px-8 lg:mt-24 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <Eyebrow>05 · The gestures</Eyebrow>
          <Headline
            text={"Four moves.\nThat's the whole UI."}
            mark="whole"
            className="mt-5 text-[clamp(44px,11vw,64px)] lg:text-[clamp(60px,5.6vw,88px)]"
          />
          <div className="mt-10 grid grid-cols-2 gap-3">
            {GESTURES.map((g, i) => (
              <Reveal key={g.name} delay={i * 0.08} className="rounded-[22px] border border-line bg-surface p-4 shadow-card sm:p-5">
                <span className={cn("grid size-11 place-items-center rounded-full border-[1.5px] border-onpastel text-onpastel", g.tone)}>
                  <g.icon className="size-5" strokeWidth={2.4} />
                </span>
                <h3 className="mt-4 font-display text-[22px] leading-none font-bold text-ink sm:text-[24px]">{g.name}</h3>
                <p className="mt-2 text-[14px] leading-snug text-muted sm:text-[15px]">{g.line}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="flex flex-col">
          <div className="rounded-card border-[1.5px] border-line-strong bg-elevated p-5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="typed font-bold text-ink">Try it: swipe the card</p>
              <p className="typed hidden text-[10px] text-faint sm:block">← dismiss · approve →</p>
            </div>

            <div className="relative mx-auto mt-6 h-[200px] w-full max-w-[330px]">
              <div className="absolute inset-x-0 top-3 scale-[0.95] opacity-70">
                <MiniCard tone={next.tone} kind={next.kind} title={next.title} action={next.action}>
                  {next.body}
                </MiniCard>
              </div>
              <AnimatePresence initial={false} custom={exit}>
                <SwipeCard key={top} card={card} onAct={act} />
              </AnimatePresence>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => act("dismiss")}
                className="inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-surface px-5 text-[15px] font-semibold text-ink transition hover:bg-bg"
              >
                <X className="size-4" /> Dismiss
              </button>
              <button
                type="button"
                onClick={() => act("approve")}
                className="inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-onpastel bg-yellow px-5 text-[15px] font-semibold text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <Check className="size-4" /> Approve
              </button>
            </div>

            <div className="mt-8 border-t border-dashed border-line pt-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-[22px] leading-none font-bold text-ink">The feed learns your taste</p>
                <div className="h-7">
                  <AnimatePresence mode="wait">
                    {toast && (
                      <motion.span
                        key={toast.id}
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: -3 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className={cn(
                          "typed hidden rounded-full border-[1.5px] border-onpastel px-2.5 py-1 text-[10px] font-bold text-onpastel sm:inline-block",
                          toast.verdict === "approve" ? "bg-mint" : "bg-rose",
                        )}
                      >
                        {toast.text}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {DECK.map((d) => (
                  <li key={d.key} className="grid grid-cols-[96px_1fr_44px] items-center gap-3">
                    <span className="typed text-[10px] text-muted">{d.kind}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-line">
                      <motion.span
                        className="block h-full rounded-full bg-lilac"
                        animate={{ width: `${(weights[d.key] / 2.5) * 100}%` }}
                        transition={SPRING}
                      />
                    </span>
                    <span className="typed text-right text-[11px] font-bold text-ink tabular-nums">{weights[d.key].toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[14px] leading-snug text-muted">
                Every gesture moves a weight. Every three, Muse Spark rewrites Maya&apos;s taste notes, and the next batch of cards
                is visibly different.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
