"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, CheckCheck, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMinerDone } from "@/components/AgentLens";
import { appScroller, useIsDesktop } from "@/components/DeviceFrame";
import { EmptyState } from "@/components/EmptyState";
import { FeedCard } from "@/components/FeedCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isPlaceholder, rankFeed, type Placeholder } from "@/lib/ranker";
import type { Card, Verdict } from "@/lib/schemas";
import { MAX_AUTO_BATCHES, useFeed } from "@/lib/store";

/** Shown while the Miner reads the context, before any card has a skeleton of its own. */
const MINER_GHOSTS: Placeholder[] = [
  { id: "g1", kind: "email_reply", label: "Reading your inbox…", status: "preparing", createdAt: 0 },
  { id: "g2", kind: "schedule", label: "Checking your calendar…", status: "preparing", createdAt: 0 },
];

/** DESIGN.md §4: cards materialize with a spring, rising 16px from a 0.98 scale. */
const spring = { type: "spring", stiffness: 260, damping: 24 } as const;
const layoutSpring = { type: "spring", stiffness: 420, damping: 38 } as const;

const variants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: (verdict: Verdict) => ({
    opacity: 0,
    x: verdict === "dismiss" ? -420 : 460,
    rotate: verdict === "dismiss" ? -7 : 9,
    transition: { duration: 0.38, ease: [0.5, 0, 0.75, 0], opacity: { duration: 0.38, ease: "easeIn" } },
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
      root: appScroller(),
      rootMargin: "0px 0px 1100px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, exhausted, ready, loadBatch]);

  return (
    <section data-testid="feed" className="pb-[calc(var(--safe-bottom,0px)+112px)]">
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
              transition={{ layout: layoutSpring }}
              className="relative"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={isPlaceholder(item) ? "skeleton" : "card"}
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
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
          art="/brand/mascot-sleep.webp"
          sticker="Inbox zero"
          kicker="Nothing left on your plate"
          title="All caught up. Go roast something."
          body="Your agents handled everything for now. Ford is napping, but he's still watching your inbox, calendar and sales."
          action={<LoadMore onClick={() => void loadBatch({ force: true })} />}
        />
      )}

      {ranked.length > 0 && loading && preparing === 0 && (
        <p className="typed flex items-center justify-center gap-2 py-8 text-[11px] text-lilac-ink">
          <span className="size-2 animate-pulse rounded-full bg-lilac" aria-hidden /> Digging up more for you…
        </p>
      )}

      {ranked.length > 0 && !loading && exhausted && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="font-display text-[22px] font-bold text-ink">That&apos;s the whole paper.</p>
          <p className="typed -mt-1 text-[10.5px] text-faint">Fresh edition when something changes</p>
          <LoadMore onClick={() => void loadBatch({ force: true })} />
        </div>
      )}
    </section>
  );
}

function LoadMore({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      <RefreshCw className="size-4" aria-hidden /> Load more
    </Button>
  );
}

function greetingFor(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** What the Miner is reading, cycled while it works (counts mirror Maya's sandbox data). */
const READING = [
  "Reading 15 emails",
  "Scanning 14 events",
  "Pulling 14 days of sales",
  "Cross-checking notes",
  "Picking what needs you",
];

function Greeting({ ready, preparing, loading }: { ready: number; preparing: number; loading: boolean }) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const things = (n: number) => `${n} thing${n === 1 ? "" : "s"}`;
  const working = loading || preparing > 0;
  const hour = now.getHours();
  const when = hour < 12 ? "overnight" : "today";
  // On desktop the column beside the phone already says hello: the phone keeps just the date.
  const desktop = useIsDesktop();

  let line: string;
  if (ready > 0) line = `Your agents prepared ${things(ready)} ${when}.`;
  else if (working) line = "Your agents are getting today ready.";
  else line = "Nothing needs you right now.";

  return (
    <header className="pt-5 pb-6">
      <p className="typed text-[10.5px] text-faint">
        {date}
        {!desktop && (
          <>
            {" "}
            <span className="text-lilac-ink">✺</span> {greetingFor(hour)}, Maya
          </>
        )}
      </p>
      <h1 className="font-display mt-1.5 text-[56px] leading-[0.9] font-black text-ink">
        <span className="relative inline-block">
          <span aria-hidden className="absolute inset-x-[-3px] bottom-[0.02em] h-[0.22em] -rotate-1 rounded-full bg-lilac" />
          <span className="relative">Today.</span>
        </span>
      </h1>
      <p className="mt-3 text-[16px] leading-snug text-muted">
        <motion.span key={line} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
          {line}
        </motion.span>
        {ready > 0 && preparing > 0 && <span className="font-medium text-lilac-ink"> {preparing} more on the way.</span>}
      </p>
      <AnimatePresence initial={false}>
        {working && ready === 0 && <WorkingStatus key="status" preparing={preparing} />}
      </AnimatePresence>
    </header>
  );
}

/**
 * The wait, made legible: Ford at work, a cycling typed line of what the agents are doing,
 * an elapsed timer, the three stages, and a progress track that fills as drafted cards land.
 */
function WorkingStatus({ preparing }: { preparing: number }) {
  const reduce = useReducedMotion();
  const mined = useMinerDone();
  const [started] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.floor((Date.now() - started) / 1000);
  const phrase = mined
    ? `Drafting ${preparing} in your voice`
    : READING[Math.floor(tick / 2) % READING.length];

  return (
    <motion.div
      data-testid="working-status"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-5 rounded-[24px] border border-line bg-surface p-3.5">
        <div className="flex items-center gap-3">
          <motion.div
            className="grid size-14 shrink-0 place-items-center rounded-full border-[1.5px] border-onpastel bg-yellow"
            animate={reduce ? undefined : { rotate: [-4, 4, -4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src="/brand/mascot-scan.webp" alt="" width={52} height={52} className="size-[52px]" priority />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="relative h-5 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={phrase}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="typed truncate text-[11px] leading-5 text-ink"
                >
                  {phrase}
                  <span className="text-lilac-ink">…</span>
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Stage label="Miner" state={mined ? "done" : "active"} />
              <span className="h-px w-2 bg-line-strong" />
              <Stage label="Preparers" state={mined ? "active" : "waiting"} />
              <span className="h-px w-2 bg-line-strong" />
              <Stage label="Ranker" state="waiting" />
            </div>
          </div>
          <span className="shrink-0 self-start font-mono text-[11px] font-bold text-lilac-ink tabular-nums" aria-label={`${elapsed} seconds`}>
            {elapsed}s
          </span>
        </div>
        <div className="relative mt-3 h-2.5 overflow-hidden rounded-full border border-line-strong bg-elevated">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-lilac"
            initial={false}
            animate={{ width: mined ? "62%" : `${Math.min(45, 6 + elapsed * 4)}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function Stage({ label, state }: { label: string; state: "done" | "active" | "waiting" }) {
  return (
    <span
      className={cn(
        "typed flex items-center gap-1 text-[9.5px] transition-colors",
        state === "active" && "font-bold text-lilac-ink",
        state === "done" && "text-ink",
        state === "waiting" && "text-faint",
      )}
    >
      {state === "done" ? (
        <Check className="size-3" strokeWidth={3} />
      ) : (
        <span className={cn("size-1.5 rounded-full", state === "active" ? "animate-pulse bg-lilac-ink" : "bg-faint")} />
      )}
      {label}
    </span>
  );
}
