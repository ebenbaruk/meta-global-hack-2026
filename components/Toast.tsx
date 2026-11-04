"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFeed, type Toast as ToastData } from "@/lib/store";

const TONES: Record<ToastData["tone"], { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  tuned: { icon: SlidersHorizontal, className: "text-accent-strong" },
  learned: { icon: Sparkles, className: "text-violet" },
  error: { icon: AlertCircle, className: "text-danger" },
};

/** Stacked toasts, bottom-center above the tab bar (above the feed column on desktop). */
export function Toaster() {
  const all = useFeed((s) => s.toasts);
  const reduce = useReducedMotion();
  // Two identical toasts in a row ("Tuned: fewer…") read as a glitch: keep the newest of each.
  const toasts = all.filter((t, i) => !all.slice(i + 1).some((n) => n.title === t.title && n.detail === t.detail));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-40 lg:bottom-8 flex flex-col items-center gap-2 px-4"
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
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="glass-border flex max-w-[420px] items-center gap-3 rounded-[20px] bg-[rgb(22_25_33/0.86)] py-2 pr-4 pl-2 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.9)] backdrop-blur-2xl backdrop-saturate-150"
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-current/15", tone.className)}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-fg">{t.title}</p>
                {t.detail && <p className="line-clamp-2 text-[12.5px] leading-snug text-muted">{t.detail}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
