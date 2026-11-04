"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { KIND_META } from "@/components/cards/kindMeta";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { useFeed, type OutboxEntry } from "@/lib/store";

function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Everything the agents executed after an approve, newest first. */
export function Outbox({ onBrowse }: { onBrowse: () => void }) {
  const outbox = useFeed((s) => s.outbox);
  const now = useNow();
  const done = outbox.filter((e) => e.state === "done").length;

  return (
    <section data-testid="outbox" className="pb-[calc(env(safe-area-inset-bottom)+112px)]">
      <header className="px-1 pt-5 pb-5">
        <p className="text-[12px] font-medium tracking-wider text-faint uppercase">Receipts</p>
        <h1 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight text-fg">Done for you</h1>
        <p className="mt-1 text-[15px] text-muted">
          {outbox.length === 0
            ? "Approved actions land here."
            : `${done} action${done === 1 ? "" : "s"} executed by your agents.`}
        </p>
      </header>

      {outbox.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nothing sent yet"
          body="Approve a card and your agents do the rest. Every action shows up here with a receipt."
          action={
            <button
              type="button"
              onClick={onBrowse}
              className="h-10 rounded-full bg-accent px-5 text-[14px] font-semibold text-white transition hover:brightness-110"
            >
              Go to your feed
            </button>
          }
        />
      ) : (
        <ul className="glass-border overflow-hidden rounded-card bg-surface shadow-card">
          <AnimatePresence initial={false}>
            {outbox.map((entry, i) => (
              <Row key={entry.cardId} entry={entry} now={now} first={i === 0} />
            ))}
          </AnimatePresence>
        </ul>
      )}
      {outbox.length > 0 && (
        <p className="mt-4 px-1 text-center text-[12px] text-faint">Actions run against Maya&apos;s sandbox tools. Nothing leaves the demo.</p>
      )}
    </section>
  );
}

function Row({ entry, now, first }: { entry: OutboxEntry; now: number; first: boolean }) {
  const reduce = useReducedMotion();
  const meta = KIND_META[entry.kind];
  const Icon = meta.icon;
  const sending = entry.state === "sending";

  return (
    <motion.li
      layout={!reduce}
      data-testid="outbox-item"
      data-state={entry.state}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(!first && "border-t border-line")}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-current/12", meta.tint)}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-fg">{entry.title}</p>
          <p className="truncate text-[12.5px] text-muted">
            {entry.detail} <span className="text-faint">· {sending ? "Sending…" : ago(entry.at, now)}</span>
          </p>
        </div>
        {sending ? (
          <span className="relative grid size-7 shrink-0 place-items-center" aria-label="Sending">
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
          </span>
        ) : (
          <DoneCheck />
        )}
      </div>
    </motion.li>
  );
}

function DoneCheck() {
  return (
    <motion.span
      aria-label="Done"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className="grid size-7 shrink-0 place-items-center rounded-full bg-success/15 text-success"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
        />
      </svg>
    </motion.span>
  );
}
