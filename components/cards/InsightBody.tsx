"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Card } from "@/lib/schemas";

type InsightCard = Extract<Card, { kind: "insight" }>;

/** One big number on a lilac "can": the stat in chunky Fraunces, the takeaway below. */
export function InsightBody({ card }: { card: InsightCard }) {
  const { stat, headline, detail } = card.payload;
  const reduce = useReducedMotion();

  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] bg-lilac p-5 text-onpastel">
      <span aria-hidden className="absolute top-3 right-4 text-[28px] leading-none opacity-80">
        ✺
      </span>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="font-display w-fit max-w-full origin-left text-[76px] leading-[0.9] font-black tracking-[-0.04em] break-words tabular-nums"
      >
        {stat}
      </motion.div>
      <h4 className="font-display mt-3 text-[20px] leading-[1.15] font-bold break-words">{headline}</h4>
      <p className="mt-2 text-[14px] leading-[1.5] break-words opacity-85">{detail}</p>
    </div>
  );
}
