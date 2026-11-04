"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { CheckCheck, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FeedCard } from "@/components/FeedCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { isPlaceholder, rankFeed, type Placeholder } from "@/lib/ranker";
import type { Card, Verdict } from "@/lib/schemas";
import { MAX_AUTO_BATCHES, useFeed } from "@/lib/store";

/** Shown while the Miner reads the context, before any card has a skeleton of its own. */
const MINER_GHOSTS: Placeholder[] = [
  { id: "g1", kind: "email_reply", label: "Reading your inbox…", status: "preparing", createdAt: 0 },
  { id: "g2", kind: "schedule", label: "Checking your calendar…", status: "preparing", createdAt: 0 },
];

const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

const variants: Variants = {
  initial: { opacity: 0, y: 28, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: (verdict: Verdict) => ({
    opacity: 0,
    x: verdict === "dismiss" ? -140 : 140,
    scale: 0.94,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
  }),
};
const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export function Feed({ onEdit, onDiveIn }: { onEdit: (card: Card) => void; onDiveIn: (card: Card) => void }) {
  const reduce = useReducedMotion();
  const items = useFeed((s) => s.items);
  const weights = useFeed((s) => s.taste.weights);
  const loading = useFeed((s) => s.loading);
  const batch = useFeed((s) => s.batch);
  const lastVerdict = useFeed((s) => s.lastVerdict);
  const { approve, dismiss, retry, loadBatch } = useFeed.getState();

  const ranked = useMemo(() => rankFeed(items, weights), [items, weights]);
  const ready = ranked.filter((i) => !isPlaceholder(i)).length;
  const preparing = ranked.filter((i) => isPlaceholder(i) && i.status === "preparing").length;
  const exhausted = batch >= MAX_AUTO_BATCHES;

  // Infinite scroll: a sentinel about two cards above the end of the feed.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || loading || exhausted || ready === 0) return;
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && void loadBatch(), {
      rootMargin: "0px 0px 1100px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, exhausted, ready, loadBatch]);

  return (
    <section data-testid="feed" className="pb-[calc(env(safe-area-inset-bottom)+112px)]">
      <Greeting ready={ready} preparing={preparing} loading={loading} />

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout" custom={lastVerdict}>
          {ranked.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduce}
              custom={lastVerdict}
              variants={reduce ? reducedVariants : variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ layout: spring }}
              className="relative"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={isPlaceholder(item) ? "skeleton" : "card"}
                  initial={{ opacity: 0, filter: "blur(6px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {isPlaceholder(item) ? (
                    <SkeletonCard item={item} onRetry={() => retry(item.id)} />
                  ) : (
                    <FeedCard
                      card={item}
                      onApprove={() => void approve(item.id)}
                      onDismiss={() => dismiss(item.id)}
                      onEdit={() => onEdit(item)}
                      onDiveIn={() => onDiveIn(item)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {ranked.length === 0 && loading && (
        <div className="flex flex-col gap-4">
          {MINER_GHOSTS.map((g) => (
            <SkeletonCard key={g.id} item={g} onRetry={() => {}} />
          ))}
        </div>
      )}

      <div ref={sentinel} aria-hidden />

      {ranked.length === 0 && !loading && batch > 0 && (
        <EmptyState
          icon={CheckCheck}
          title="You're all caught up"
          body="Your agents handled everything for now. They'll keep watching your inbox, calendar and sales."
          action={<LoadMore onClick={() => void loadBatch({ force: true })} />}
        />
      )}

      {ranked.length > 0 && loading && preparing === 0 && (
        <p className="flex items-center justify-center gap-2 py-8 text-[13px] text-faint">
          <Loader2 className="size-4 animate-spin" /> Finding more for you…
        </p>
      )}

      {ranked.length > 0 && !loading && exhausted && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[13px] text-faint">That&apos;s everything for now.</p>
          <LoadMore onClick={() => void loadBatch({ force: true })} />
        </div>
      )}
    </section>
  );
}

function LoadMore({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-4 text-[13.5px] font-medium text-fg transition hover:bg-white/[0.08]"
    >
      <RefreshCw className="size-4" /> Load more
    </button>
  );
}

function greetingFor(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Greeting({ ready, preparing, loading }: { ready: number; preparing: number; loading: boolean }) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const things = (n: number) => `${n} thing${n === 1 ? "" : "s"}`;

  let line: string;
  if (ready > 0) line = `${things(ready)} ${ready === 1 ? "is" : "are"} ready.`;
  else if (preparing > 0) line = `Your agents are preparing ${things(preparing)}…`;
  else if (loading) line = "Your agents are reading your inbox, calendar and sales…";
  else line = "Nothing needs you right now.";

  return (
    <header className="px-1 pt-5 pb-5">
      <p className="text-[12px] font-medium tracking-wider text-faint uppercase">{date}</p>
      <h1 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight text-fg">
        {greetingFor(now.getHours())}, Maya.
      </h1>
      <p className="mt-1 text-[15px] text-muted">
        <motion.span key={line} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
          {line}
        </motion.span>
        {ready > 0 && preparing > 0 && <span className="text-accent-strong"> {preparing} more on the way.</span>}
      </p>
    </header>
  );
}
