"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFeed, type Toast as ToastData } from "@/lib/store";

const TONES: Record<ToastData["tone"], { icon: typeof Check; chip: string }> = {
  success: { icon: Check, chip: "bg-mint text-onpastel" },
  tuned: { icon: SlidersHorizontal, chip: "bg-yellow text-onpastel" },
  learned: { icon: Sparkles, chip: "bg-lilac text-onpastel" },
  error: { icon: AlertCircle, chip: "bg-danger text-surface" },
};

/** Stacked toasts, bottom-center above the tab bar (inside the phone screen on desktop). */
export function Toaster() {
  const all = useFeed((s) => s.toasts);
  const reduce = useReducedMotion();
  // Two identical toasts in a row ("Tuned: fewer…") read as a glitch: keep the newest of each.
  const toasts = all.filter((t, i) => !all.slice(i + 1).some((n) => n.title === t.title && n.detail === t.detail));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom,0px)+92px)] z-40 flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONES[t.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={t.id}
              layout={!reduce}
              data-testid="toast"
              data-tone={t.tone}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex max-w-[360px] items-center gap-3 rounded-[22px] border-[1.5px] border-line-strong bg-surface py-2 pr-4 pl-2 shadow-ink"
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-onpastel", tone.chip)}>
                <Icon className="size-4" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">{t.title}</p>
                {t.detail && <p className="line-clamp-2 text-[12.5px] leading-snug text-muted">{t.detail}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
