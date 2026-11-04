"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { KIND_META } from "@/components/cards/kindMeta";
import { cn } from "@/lib/cn";
import type { Placeholder } from "@/lib/ranker";

/** A card an agent is still preparing: same anatomy as FeedCard, shimmering, with a live label. */
export function SkeletonCard({ item, onRetry }: { item: Placeholder; onRetry: () => void }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;

  if (item.status === "error") {
    return (
      <article data-testid="card-error" className="rounded-card border border-danger/20 bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-fg">Couldn&apos;t prepare this {meta.label.toLowerCase()}</p>
            <p className="truncate text-[13px] text-muted">{item.error ?? "The agent ran into a problem."}</p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-[13px] font-medium text-fg transition hover:bg-white/[0.12]"
          >
            <RotateCcw className="size-3.5" />
            Retry
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid="skeleton-card"
      data-kind={item.kind}
      aria-busy="true"
      className="glass-border relative overflow-hidden rounded-card bg-surface shadow-card"
    >
      <div className="scanline" aria-hidden />
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-current/10 transition-colors", meta.tint)}>
          <Icon key={item.kind} className="size-[18px] opacity-70" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={item.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="truncate text-[13px] font-medium text-accent-strong"
              >
                {item.label}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="skeleton h-3.5 w-3/5 rounded-full" />
        </div>
      </div>
      <div className="space-y-2.5 px-4 pb-4">
        <div className="skeleton h-3 w-11/12 rounded-full" />
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
      <div className="flex gap-2 border-t border-line p-3">
        <div className="skeleton h-11 flex-1 rounded-full" />
        <div className="skeleton size-11 rounded-full" />
        <div className="skeleton size-11 rounded-full" />
        <div className="skeleton size-11 rounded-full" />
      </div>
    </article>
  );
}
