"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Card } from "@/lib/schemas";

type TaskCard = Extract<Card, { kind: "task" }>;

/** A checklist on a notepad. Ticking is a local preview only; the action bar creates the real task. */
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
    <div className="min-w-0 rounded-[20px] border border-line bg-bg">
      <div className="typed flex items-center justify-between border-b border-line px-4 pt-3 pb-2.5 text-[10px] text-faint">
        <span>To do · {steps.length} steps</span>
        <span className={cn("tabular-nums", checked.size === steps.length && steps.length > 0 && "text-ink")}>
          {checked.size}/{steps.length} done
        </span>
      </div>
      <ol className="flex flex-col px-1.5 py-1.5">
        {steps.map((step, i) => {
          const done = checked.has(i);
          return (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 340, damping: 30 }}
              className="border-b border-dashed border-line last:border-b-0"
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={done}
                className="flex w-full min-w-0 items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-elevated"
              >
                <span
                  className={cn(
                    "mt-px grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors",
                    done ? "border-onpastel bg-mint text-onpastel" : "border-line-strong",
                  )}
                >
                  {done && (
                    <motion.span
                      initial={reduce ? false : { scale: 0.3, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 18 }}
                    >
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </motion.span>
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 break-words text-[14.5px] leading-[1.45] transition-colors",
                    done ? "text-faint line-through decoration-faint" : "text-ink",
                  )}
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
