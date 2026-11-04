"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { KindSticker } from "@/components/cards/KindSticker";
import { KIND_META } from "@/components/cards/kindMeta";
import { cn } from "@/lib/cn";
import type { Placeholder } from "@/lib/ranker";

const TYPE_MS = 32;

/** Types a label in, character by character, with a blinking block caret. Key it by text to restart. */
function TypedLine({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduce || n >= text.length) return;
    const t = setTimeout(() => setN(n + 1), TYPE_MS);
    return () => clearTimeout(t);
  }, [reduce, n, text]);

  return (
    <span className="typed flex min-w-0 items-center text-[11px] text-lilac-ink" aria-label={text}>
      <span className="truncate" aria-hidden>
        {reduce ? text : text.slice(0, n)}
      </span>
      <motion.span
        aria-hidden
        className="ml-0.5 inline-block h-[1.15em] w-[0.6em] shrink-0 bg-lilac-ink"
        animate={reduce ? undefined : { opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
      />
    </span>
  );
}

/** A card an agent is still preparing: same anatomy as FeedCard, a lilac shimmer, and a live typed label. */
export function SkeletonCard({ item, onRetry }: { item: Placeholder; onRetry: () => void }) {
  const meta = KIND_META[item.kind];

  if (item.status === "error") {
    return (
      <article data-testid="card-error" className="rounded-card border-[1.5px] border-danger/40 bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <KindSticker kind={item.kind} />
          <span className="typed text-[10px] text-danger">Agent stumbled</span>
        </div>
        <p className="font-display mt-3 text-[21px] leading-tight font-bold text-ink">
          Couldn&apos;t finish this {meta.label.toLowerCase()}.
        </p>
        <p className="mt-1.5 text-[14px] leading-[1.5] break-words text-muted">{item.error ?? "The agent ran into a problem."}</p>
        <Button variant="secondary" onClick={onRetry} className="mt-4 h-10 px-4 text-[14px]">
          <RotateCcw className="size-4" aria-hidden />
          Retry
        </Button>
      </article>
    );
  }

  return (
    <article
      data-testid="skeleton-card"
      data-kind={item.kind}
      aria-busy="true"
      className="relative overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-1.5 opacity-70", item.kind === "task" ? "bg-line-strong" : meta.can)} />
      <div className="scanline" aria-hidden />
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <KindSticker kind={item.kind} className="opacity-80" />
          <span className="typed text-[10px] text-faint">Working…</span>
        </div>
        <div className="mt-3.5 h-4">
          <TypedLine key={item.label} text={item.label} />
        </div>
        <div className="skeleton mt-2.5 h-6 w-4/5 rounded-full" />
        <div className="skeleton mt-2 h-6 w-1/2 rounded-full" />
      </div>
      <div className="space-y-2.5 px-4 pb-4">
        <div className="skeleton h-3 w-11/12 rounded-full" />
        <div className="skeleton h-28 w-full rounded-[20px]" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
      <div className="flex gap-2 px-4 pt-1 pb-4">
        <div className="skeleton h-12 flex-1 rounded-full" />
        <div className="skeleton size-11 rounded-full" />
        <div className="skeleton size-11 rounded-full" />
        <div className="skeleton size-11 rounded-full" />
      </div>
    </article>
  );
}
