"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";
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

/** Live status of the agents: how many are preparing right now. */
export function AgentStatus() {
  const preparing = useFeed(selectPreparingCount);
  const busy = useFeed((s) => s.loading || s.snapping);
  const label =
    preparing > 0 ? `${preparing} agent${preparing === 1 ? "" : "s"} working` : busy ? "Agents reading" : "Up to date";
  const live = preparing > 0 || busy;

  return (
    <div
      data-testid="agent-status"
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors",
        live ? "border-accent/30 bg-accent-soft text-accent-strong" : "border-line bg-white/[0.03] text-faint",
      )}
    >
      <span className="relative flex size-1.5">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-strong opacity-70" />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", live ? "bg-accent-strong" : "bg-success")} />
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
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

export function TopBar({ onOpenLens }: { onOpenLens: () => void }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-line/60 bg-bg/70 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:mx-0 lg:border-none lg:bg-transparent lg:px-1 lg:backdrop-blur-none">
      <div className="flex h-14 items-center gap-2">
        <Wordmark />
        <div className="flex-1" />
        <AgentStatus />
        <button
          type="button"
          onClick={onOpenLens}
          aria-label="Open Agent Lens"
          data-testid="lens-btn"
          className="grid size-8 place-items-center rounded-full bg-white/[0.06] text-muted transition hover:bg-white/10 hover:text-fg lg:hidden"
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
