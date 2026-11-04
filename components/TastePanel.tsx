"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { KIND_META } from "@/components/cards/kindMeta";
import { Sticker, type StickerTone } from "@/components/ui/Sticker";
import { cn } from "@/lib/cn";
import { CARD_KINDS, type CardKind } from "@/lib/schemas";
import { useFeed } from "@/lib/store";
import { WEIGHT_MAX } from "@/lib/taste";

/** Each card kind's pastel "can" color (docs/DESIGN.md §1). Pastels always carry onpastel text. */
export const KIND_CAN: Record<CardKind, string> = {
  email_reply: "bg-sky",
  team_update: "bg-mint",
  schedule: "bg-tangerine",
  social_post: "bg-rose",
  task: "bg-elevated",
  insight: "bg-lilac",
  snap: "bg-mint",
  sponsored: "bg-yellow",
};

/** A small kind tile: the can color with an ink outline (task has no pastel, so it reads in ink). */
export const kindTile = (kind: CardKind) =>
  cn("border-[1.5px]", KIND_CAN[kind], kind === "task" ? "border-line-strong text-ink" : "border-onpastel text-onpastel");

const NOTE_TONES: { fill: string; rotate: number }[] = [
  { fill: "bg-lilac", rotate: -1.5 },
  { fill: "bg-yellow", rotate: 1.2 },
  { fill: "bg-mint", rotate: -0.8 },
  { fill: "bg-rose", rotate: 1.6 },
];

/**
 * Maya's taste profile: weights per kind that move with every gesture, and what the feed learned.
 * `profile={false}` drops her name card (on desktop the column beside it already greets her) but keeps the tallies.
 */
export function TastePanel({ className, profile = true }: { className?: string; profile?: boolean }) {
  const weights = useFeed((s) => s.taste.weights);
  const notes = useFeed((s) => s.taste.notes);
  const history = useFeed((s) => s.taste.history);
  const lastTuned = useFeed((s) => s.lastTuned);
  const reset = useFeed((s) => s.reset);
  const flash = useRecent(lastTuned?.at, 1800);
  const reduce = useReducedMotion();

  const counts = { approve: 0, dismiss: 0, edit: 0 };
  for (const h of history) counts[h.verdict]++;

  return (
    <div data-testid="taste-panel" className={cn("flex flex-col gap-3", className)}>
      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        {profile && (
          <div className="mb-4 flex items-center gap-3">
            <span
              aria-label="Maya"
              className="grid size-12 shrink-0 -rotate-3 place-items-center rounded-full border-[1.5px] border-onpastel bg-lilac font-display text-[22px] font-black text-onpastel"
            >
              M
            </span>
            <div className="min-w-0">
              <p className="font-display text-[20px] leading-tight font-extrabold text-ink">Maya Chen</p>
              <p className="typed mt-1 truncate text-[10px] text-muted">Founder · Ember &amp; Oak Coffee</p>
            </div>
          </div>
        )}
        {!profile && <p className="typed mb-3 text-[10px] text-faint">Your calls so far</p>}
        <div className="grid grid-cols-3 divide-x divide-line rounded-[20px] bg-elevated py-3">
          <Stat label="Approved" value={counts.approve} dot="bg-mint" />
          <Stat label="Edited" value={counts.edit} dot="bg-lilac" />
          <Stat label="Dismissed" value={counts.dismiss} dot="bg-rose" />
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        <p className="typed text-[10px] text-faint">Taste profile</p>
        <h2 className="mt-1 font-display text-[22px] leading-[1.05] font-extrabold text-ink">What your feed learned</h2>
        <p className="mt-1 text-[13px] text-muted">Every swipe retunes the ranker.</p>
        <ul className="mt-4 space-y-3">
          {CARD_KINDS.map((kind) => (
            <WeightRow
              key={kind}
              kind={kind}
              weight={weights[kind]}
              delta={flash && lastTuned?.kind === kind ? lastTuned.delta : undefined}
            />
          ))}
        </ul>
        <p className="typed mt-4 flex items-center gap-2 text-[9.5px] text-faint">
          <span className="h-3 w-[1.5px] bg-line-strong" aria-hidden /> 1.0× = neutral
        </p>
      </section>

      <section className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[18px] leading-tight font-extrabold text-ink">Notes to self</h2>
          <Sticker tone="yellow" rotate={5}>
            Learned
          </Sticker>
        </div>
        {notes.length === 0 ? (
          <p className="mt-3 rounded-[20px] border-[1.5px] border-dashed border-line px-4 py-4 text-[13px] leading-relaxed text-muted">
            Every 3 gestures, Muse Spark rewrites these notes. They steer what your agents look for next.
          </p>
        ) : (
          <ul className="mt-4 space-y-3" data-testid="taste-notes">
            <AnimatePresence initial={false}>
              {notes.map((note, i) => {
                const tone = NOTE_TONES[i % NOTE_TONES.length];
                return (
                  <motion.li
                    key={note}
                    layout={!reduce}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: tone.rotate - 4 }}
                    animate={{ opacity: 1, scale: 1, rotate: tone.rotate }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className={cn(
                      "relative rounded-[14px] border-[1.5px] border-onpastel py-3 pr-3 pl-9 text-[13.5px] leading-snug font-medium text-onpastel",
                      tone.fill,
                    )}
                  >
                    <span aria-hidden className="absolute top-1 left-2.5 font-display text-[34px] leading-none font-black">
                      “
                    </span>
                    {note}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={reset}
        data-testid="reset-btn"
        className="typed flex items-center justify-center gap-1.5 self-center rounded-full border border-transparent px-3 py-2 text-[10px] text-faint transition hover:border-line hover:text-ink"
      >
        <RotateCcw className="size-3.5" /> Reset demo
      </button>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="px-2 text-center">
      <motion.p
        key={value}
        initial={reduce ? false : { scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 16 }}
        className="font-display text-[30px] leading-none font-black text-ink tabular-nums"
      >
        {value}
      </motion.p>
      <p className="typed mt-1.5 flex items-center justify-center gap-1 text-[9px] text-muted">
        <span className={cn("size-1.5 rounded-full border border-onpastel", dot)} aria-hidden />
        {label}
      </p>
    </div>
  );
}

function WeightRow({ kind, weight, delta }: { kind: CardKind; weight: number; delta?: number }) {
  const reduce = useReducedMotion();
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const pct = Math.max(6, (weight / WEIGHT_MAX) * 100);
  const neutral = (1 / WEIGHT_MAX) * 100;
  const up = (delta ?? 0) > 0;
  const tone: StickerTone = up ? "mint" : "rose";

  return (
    <li data-testid={`taste-weight-${kind}`} data-weight={weight.toFixed(2)}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={cn("grid size-5 place-items-center rounded-md", kindTile(kind))}>
          <Icon className="size-3" strokeWidth={2.4} />
        </span>
        <span className="text-[13px] font-medium text-ink">{meta.label}</span>
        <AnimatePresence>
          {delta !== undefined && (
            <Sticker key="delta" tone={tone} rotate={up ? -5 : 5}>
              {up ? "+" : "−"}
              {Math.abs(delta).toFixed(2)}
            </Sticker>
          )}
        </AnimatePresence>
        <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">{weight.toFixed(2)}×</span>
      </div>
      <div className="relative h-3.5 rounded-full border border-line bg-elevated">
        <motion.div
          className={cn(
            "absolute inset-y-[-1px] left-[-1px] rounded-full border-[1.5px] border-onpastel",
            kind === "task" ? "bg-ink" : KIND_CAN[kind],
          )}
          initial={false}
          animate={{ width: `calc(${pct}% + 2px)` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 20 }}
        />
        <span
          aria-hidden
          className="absolute -inset-y-1 z-10 w-[1.5px] rounded-full bg-line-strong"
          style={{ left: `${neutral}%` }}
        />
      </div>
    </li>
  );
}

/** True for `ms` after `at` changes. */
export function useRecent(at: number | undefined, ms: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!at || Date.now() - at > ms) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), ms - (Date.now() - at));
    return () => clearTimeout(t);
  }, [at, ms]);
  return on;
}
