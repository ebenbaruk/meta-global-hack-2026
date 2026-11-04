"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  lilac: "bg-lilac",
  yellow: "bg-yellow",
  mint: "bg-mint",
  sky: "bg-sky",
  rose: "bg-rose",
  tangerine: "bg-tangerine",
} as const;
export type StickerTone = keyof typeof TONES;

/** A small rotated badge: pastel fill, ink outline, typed caps. Pops in with a spring. */
export function Sticker({
  children,
  tone = "lilac",
  rotate = -4,
  className,
}: {
  children: ReactNode;
  tone?: StickerTone;
  rotate?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? { opacity: 0 } : { scale: 0, rotate: rotate - 12 }}
      animate={reduce ? { opacity: 1 } : { scale: 1, rotate }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={cn(
        "typed inline-flex items-center gap-1 rounded-full border-[1.5px] border-onpastel px-2.5 py-1 text-[10px] font-bold leading-none text-onpastel",
        TONES[tone],
        className,
      )}
    >
      {children}
    </motion.span>
  );
}
