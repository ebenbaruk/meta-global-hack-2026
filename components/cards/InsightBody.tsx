"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Card } from "@/lib/schemas";

type InsightCard = Extract<Card, { kind: "insight" }>;

export function InsightBody({ card }: { card: InsightCard }) {
  const { stat, headline, detail } = card.payload;
  const reduce = useReducedMotion();

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-elevated/60 px-4 pt-4 pb-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(61 123 255 / 0.45), rgb(139 92 246 / 0.2) 50%, transparent 70%)" }}
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative w-fit max-w-full bg-gradient-to-br from-white via-accent-strong to-violet bg-clip-text pb-1 text-5xl leading-none font-semibold tracking-tighter break-words text-transparent tabular-nums"
      >
        {stat}
      </motion.div>
      <h3 className="relative mt-3 text-[15px] leading-snug font-semibold break-words text-fg">{headline}</h3>
      <p className="relative mt-1.5 text-[14px] leading-[1.5] break-words text-muted">{detail}</p>
    </div>
  );
}
