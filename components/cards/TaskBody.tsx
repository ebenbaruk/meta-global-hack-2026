"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import type { Card } from "@/lib/schemas";

type TaskCard = Extract<Card, { kind: "task" }>;

/** Numbered checklist. Ticking is a local preview only; the action bar creates the real task. */
export function TaskBody({ card }: { card: TaskCard }) {
  const { steps } = card.payload;
  const reduce = useReducedMotion();
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="min-w-0 rounded-2xl border border-line bg-elevated/60 p-1.5">
      <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
        <span>{steps.length} steps</span>
        <span className="tabular-nums">
          {checked.size}/{steps.length}
        </span>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const done = checked.has(i);
          return (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 340, damping: 30 }}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={done}
                className="flex w-full min-w-0 items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className={`relative mt-px grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tabular-nums transition-colors ${
                    done ? "border-success bg-success text-black" : "border-line-strong text-muted"
                  }`}
                >
                  {done ? (
                    <motion.span
                      initial={reduce ? false : { scale: 0.3, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 18 }}
                    >
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </motion.span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`min-w-0 break-words text-[14px] leading-[1.45] transition-colors ${
                    done ? "text-faint line-through decoration-faint/60" : "text-fg/90"
                  }`}
                >
                  {step}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
