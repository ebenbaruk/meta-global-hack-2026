"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { KIND_META } from "@/components/cards/kindMeta";
import { Avatar } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import { CARD_KINDS, type CardKind } from "@/lib/schemas";
import { useFeed } from "@/lib/store";
import { WEIGHT_MAX } from "@/lib/taste";

/** Maya's taste profile: weights per kind that move with every gesture, and what the feed learned. */
export function TastePanel({ className }: { className?: string }) {
  const weights = useFeed((s) => s.taste.weights);
  const notes = useFeed((s) => s.taste.notes);
  const history = useFeed((s) => s.taste.history);
  const lastTuned = useFeed((s) => s.lastTuned);
  const reset = useFeed((s) => s.reset);
  const flash = useRecent(lastTuned?.at, 1800);

  const counts = { approve: 0, dismiss: 0, edit: 0 };
  for (const h of history) counts[h.verdict]++;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <section className="glass-border rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar size="lg" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-fg">Maya Chen</p>
            <p className="truncate text-[12.5px] text-muted">Founder · Ember &amp; Oak Coffee Roasters</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Approved" value={counts.approve} tone="text-success" />
          <Stat label="Edited" value={counts.edit} tone="text-accent-strong" />
          <Stat label="Dismissed" value={counts.dismiss} tone="text-danger" />
        </div>
      </section>

      <section className="glass-border rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-[13px] font-semibold text-fg">Taste weights</h2>
        <p className="mt-0.5 text-[12px] text-faint">Every gesture retunes the ranker.</p>
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
      </section>

      <section className="glass-border rounded-card bg-surface p-4 shadow-card">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <Sparkles className="size-3.5 text-violet" /> What the feed learned
        </h2>
        {notes.length === 0 ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
            After every 3 gestures, Muse Spark rewrites these notes. They steer what your agents look for next.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="taste-notes">
            <AnimatePresence initial={false}>
              {notes.map((note) => (
                <motion.li
                  key={note}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2 text-[13px] leading-snug text-muted"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-violet" />
                  {note}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={reset}
        data-testid="reset-btn"
        className="flex items-center justify-center gap-1.5 self-center rounded-full px-3 py-1.5 text-[12px] text-faint transition hover:bg-white/[0.04] hover:text-muted"
      >
        <RotateCcw className="size-3.5" /> Reset demo
      </button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-2 py-2 text-center">
      <motion.p key={value} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className={cn("text-[17px] font-semibold tabular-nums", tone)}>
        {value}
      </motion.p>
      <p className="text-[11px] text-faint">{label}</p>
    </div>
  );
}

function WeightRow({ kind, weight, delta }: { kind: CardKind; weight: number; delta?: number }) {
  const reduce = useReducedMotion();
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const pct = (weight / WEIGHT_MAX) * 100;
  const up = (delta ?? 0) > 0;

  return (
    <li data-testid={`taste-weight-${kind}`} data-weight={weight.toFixed(2)}>
      <div className="mb-1.5 flex items-center gap-2 text-[12.5px]">
        <Icon className={cn("size-3.5", meta.tint)} />
        <span className="text-muted">{meta.label}</span>
        <AnimatePresence>
          {delta !== undefined && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn("text-[11px] font-semibold tabular-nums", up ? "text-success" : "text-danger")}
            >
              {up ? "+" : "−"}
              {Math.abs(delta).toFixed(2)}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="ml-auto font-mono text-[11.5px] text-faint tabular-nums">{weight.toFixed(2)}×</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <span className="absolute inset-y-0 left-[40%] z-10 w-px bg-white/20" aria-hidden />
        <motion.div
          className={cn(
            "h-full rounded-full",
            delta !== undefined ? (up ? "bg-success" : "bg-danger") : "bg-gradient-to-r from-accent to-accent-strong",
          )}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 22 }}
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
