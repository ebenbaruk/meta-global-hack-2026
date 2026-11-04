"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Inbox, Newspaper } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFeed } from "@/lib/store";

export type Tab = "feed" | "outbox";

/** Bottom tab bar: Feed · Snap (raised yellow button) · Outbox. Pinned to the phone screen on desktop. */
export function TabBar({ tab, onTab, onSnap }: { tab: Tab; onTab: (t: Tab) => void; onSnap: () => void }) {
  const snapping = useFeed((s) => s.snapping);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[var(--safe-bottom,14px)]">
      {/* Scrim: content fades into the paper under the bar instead of colliding with it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom,14px)+104px)] bg-gradient-to-t from-bg via-bg/90 to-transparent"
      />
      <div className="relative mx-auto grid h-[62px] max-w-[360px] grid-cols-[1fr_76px_1fr] items-center rounded-full border-[1.5px] border-line-strong bg-surface px-1.5 shadow-pop">
        <TabButton testId="tab-feed" active={tab === "feed"} onClick={() => onTab("feed")} label="Feed">
          <Newspaper className="size-[19px]" strokeWidth={2.1} />
        </TabButton>

        <div className="relative h-full">
          <motion.button
            type="button"
            data-testid="tab-snap"
            onClick={onSnap}
            aria-label="Snap a photo"
            whileTap={{ scale: 0.92 }}
            className="absolute -top-[28px] left-1/2 grid size-[54px] -translate-x-1/2 place-items-center rounded-full border-[1.5px] border-onpastel bg-yellow text-onpastel shadow-ink-lg transition-[box-shadow,translate] hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-ink"
          >
            {snapping && <span className="absolute -inset-1 animate-ping rounded-full border-2 border-yellow" />}
            <Camera className="relative size-6" strokeWidth={2.2} />
          </motion.button>
          {/* Same baseline as the Feed and Outbox labels, clear of the raised button. */}
          <span className="typed pointer-events-none absolute inset-x-0 bottom-[13px] text-center text-[9.5px] leading-none font-bold text-ink">
            Snap
          </span>
        </div>

        <TabButton testId="tab-outbox" active={tab === "outbox"} onClick={() => onTab("outbox")} label="Outbox" badge={<OutboxBadge />}>
          <Inbox className="size-[19px]" strokeWidth={2.1} />
        </TabButton>
      </div>
    </nav>
  );
}

function OutboxBadge() {
  const count = useFeed((s) => s.outbox.length);
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          data-testid="outbox-badge"
          initial={{ scale: 0.3, rotate: -20 }}
          animate={{ scale: 1, rotate: 8 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 16 }}
          className="absolute -top-1.5 -right-2.5 grid h-[19px] min-w-[19px] place-items-center rounded-full border-[1.5px] border-onpastel bg-mint px-1 font-mono text-[10px] font-bold text-onpastel tabular-nums"
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function TabButton({
  testId,
  active,
  onClick,
  label,
  badge,
  children,
}: {
  testId: string;
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex h-[50px] flex-col items-center justify-center gap-[5px] rounded-full transition-colors",
        active ? "text-onpastel" : "text-muted hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="absolute inset-y-0 left-1/2 w-[min(100%,112px)] -translate-x-1/2 rounded-full border-[1.5px] border-onpastel bg-lilac"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative">
        {children}
        {badge}
      </span>
      <span className="typed relative text-[9.5px] leading-none font-bold">{label}</span>
    </button>
  );
}
