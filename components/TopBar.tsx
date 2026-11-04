"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity } from "lucide-react";
import type { Tab } from "@/components/TabBar";
import { cn } from "@/lib/cn";
import { selectPreparingCount, useFeed } from "@/lib/store";

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative grid size-7 place-items-center rounded-[9px] bg-gradient-to-br from-accent via-[#5a6bff] to-violet shadow-[0_4px_16px_-4px_rgb(61_123_255/0.8)]">
        <svg viewBox="0 0 20 20" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M5 6h7M5 10h10M5 14h5" />
          <path d="M14 12.5l2 1.5-2 1.5" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-fg">Feedforward</span>
    </div>
  );
}

/** Live status of the agents: how many are preparing right now. The pill grows, sweeps and counts while they work. */
export function AgentStatus() {
  const reduce = useReducedMotion();
  const preparing = useFeed(selectPreparingCount);
  const busy = useFeed((s) => s.loading || s.snapping);
  const live = preparing > 0 || busy;
  const label = preparing > 0 ? "working" : busy ? "Reading" : "Up to date";
  // "5 agents working" on roomy screens, "5 working" on a phone.
  const noun = preparing > 0 ? `agent${preparing === 1 ? "" : "s"} ` : busy ? "" : null;

  return (
    <motion.div
      layout={!reduce}
      data-testid="agent-status"
      transition={{ type: "spring", stiffness: 500, damping: 36 }}
      className={cn(
        "relative flex h-7 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors duration-300",
        live ? "border-accent/35 bg-accent-soft text-accent-strong" : "border-line bg-white/[0.03] text-muted",
      )}
    >
      {live && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          initial={{ x: -48 }}
          animate={{ x: 200 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
        />
      )}
      <motion.span layout={!reduce ? "position" : false} className="relative flex size-1.5">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-strong opacity-70" />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", live ? "bg-accent-strong" : "bg-success")} />
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        {preparing > 0 && (
          <motion.span
            key={preparing}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative font-mono font-semibold tabular-nums"
          >
            {preparing}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          className="relative"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          {noun && <span className="hidden sm:inline">{noun}</span>}
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

export function Avatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      aria-label="Maya"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f3c78b] via-[#c46a3a] to-[#5a2a14] font-semibold text-white ring-2 ring-white/10",
        size === "sm" ? "size-8 text-[13px]" : "size-12 text-[18px]",
      )}
    >
      M
    </span>
  );
}

export function TopBar({ tab, onOpenLens }: { tab: Tab; onOpenLens: () => void }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-line/60 bg-bg/75 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 lg:mx-0 lg:border-none lg:bg-transparent lg:px-1 lg:backdrop-blur-none">
      {/* Desktop: no bar, just a soft fade so cards slide under the status pill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 hidden h-[72px] bg-bg/85 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,#000_65%,transparent)] lg:block"
      />
      <div className="relative flex h-14 items-center gap-2">
        <span className="lg:hidden">
          <Wordmark />
        </span>
        <span className="hidden text-[13px] font-medium text-muted lg:inline">{tab === "feed" ? "For you" : "Outbox"}</span>
        <div className="flex-1" />
        <AgentStatus />
        <button
          type="button"
          onClick={onOpenLens}
          aria-label="Open Agent Lens"
          data-testid="lens-btn"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-muted transition hover:bg-white/10 hover:text-fg lg:hidden"
        >
          <Activity className="size-4" />
        </button>
        <span className="lg:hidden">
          <Avatar />
        </span>
      </div>
    </div>
  );
}
