"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScanEye } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/ui/Logo";
import { Marquee } from "@/components/ui/Marquee";
import { cn } from "@/lib/cn";
import { selectPreparingCount, useFeed } from "@/lib/store";

/** What the agents went through overnight (counts mirror Maya's sandbox data). */
export const OVERNIGHT = [
  "15 emails read",
  "14 calendar events checked",
  "14 days of sales pulled",
  "Drafted in your voice",
  "Nothing sends without you",
  "Muse Spark reads · SAM 3.1 outlines",
];

/** Live status of the agents: "Reading…", "3 drafting", then "Ready". */
export function AgentStatus() {
  const reduce = useReducedMotion();
  const preparing = useFeed(selectPreparingCount);
  const busy = useFeed((s) => s.loading || s.snapping);
  const live = preparing > 0 || busy;
  const label = preparing > 0 ? `${preparing} drafting` : busy ? "Reading…" : "Ready";

  return (
    <motion.div
      layout={!reduce}
      data-testid="agent-status"
      data-live={live || undefined}
      transition={{ type: "spring", stiffness: 500, damping: 36 }}
      className={cn(
        "typed relative flex h-7 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border-[1.5px] px-2 text-[10px] font-bold tracking-[0.03em] whitespace-nowrap transition-colors duration-300",
        live ? "border-onpastel bg-lilac text-onpastel" : "border-line-strong bg-surface text-ink",
      )}
    >
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-onpastel opacity-50" />}
        <span className={cn("relative inline-flex size-2 rounded-full border border-onpastel", live ? "bg-yellow" : "bg-mint")} />
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          className="relative tabular-nums"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

/** Maya's avatar: a tangerine coin with her initial in the display serif. */
export function Avatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      aria-label="Maya"
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-[1.5px] border-onpastel bg-tangerine font-display font-black text-onpastel",
        size === "sm" ? "size-8 text-[15px]" : "size-12 text-[22px]",
      )}
    >
      M
    </span>
  );
}

/** Compact sticky bar of the app: mark + wordmark, live status, theme, and (mobile) the lens. */
export function TopBar({ onOpenLens }: { onOpenLens?: () => void }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[var(--safe-top,0px)] backdrop-blur-md">
        {/* A container query (not a viewport breakpoint) drops the wordmark only when the bar is too narrow for it. */}
        <div className="@container flex h-14 items-center gap-1.5 px-4">
          <span className="flex min-w-0 items-center gap-1.5">
            <LogoMark className="size-8 shrink-0 -rotate-6" />
            <span className="hidden font-display text-[17px] leading-none font-black text-ink @min-[352px]:inline">
              feedforward
            </span>
          </span>
          <div className="flex-1" />
          <AgentStatus />
          <ThemeToggle className="size-9 shrink-0" />
          {onOpenLens && (
            <button
              type="button"
              onClick={onOpenLens}
              aria-label="Open Agent Lens"
              data-testid="lens-btn"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-elevated text-ink transition hover:border-line-strong"
            >
              <ScanEye className="size-[18px]" />
            </button>
          )}
        </div>
      </header>
      <Marquee items={OVERNIGHT} speed={34} className="border-b-[1.5px] border-onpastel bg-lilac py-1.5 text-onpastel" />
    </>
  );
}
