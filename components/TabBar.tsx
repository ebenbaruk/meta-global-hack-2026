"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Inbox, LayoutList } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFeed } from "@/lib/store";

export type Tab = "feed" | "outbox";

interface NavProps {
  tab: Tab;
  onTab: (t: Tab) => void;
  onSnap: () => void;
}

const DESKTOP = "(min-width: 1024px)";

/** True at the `lg` breakpoint, where navigation moves from the dock into the left column. */
export function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/** Mobile: floating glass dock, Feed · Snap (center, prominent) · Outbox with a badge. */
export function TabBar({ tab, onTab, onSnap }: NavProps) {
  const snapping = useFeed((s) => s.snapping);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),14px)] lg:hidden">
      {/* Scrim: content fades out under the dock instead of colliding with it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(env(safe-area-inset-bottom)+120px)] bg-gradient-to-t from-bg via-bg/85 to-transparent"
      />
      <div className="glass-border relative flex items-center gap-1 rounded-full bg-[rgb(22_25_33/0.72)] p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)] backdrop-blur-2xl backdrop-saturate-150">
        <DockButton testId="tab-feed" active={tab === "feed"} onClick={() => onTab("feed")} label="Feed">
          <LayoutList className="size-[18px]" />
        </DockButton>

        <button
          type="button"
          data-testid="tab-snap"
          onClick={onSnap}
          aria-label="Snap a photo"
          className="group relative mx-1 grid size-12 place-items-center rounded-full bg-gradient-to-br from-accent to-violet text-white shadow-[0_8px_24px_-6px_rgb(61_123_255/0.8)] transition active:scale-95"
        >
          {snapping && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />}
          <Camera className="relative size-5 transition group-hover:scale-110" />
        </button>

        <DockButton testId="tab-outbox" active={tab === "outbox"} onClick={() => onTab("outbox")} label="Outbox" badge={<OutboxBadge />}>
          <Inbox className="size-[18px]" />
        </DockButton>
      </div>
    </nav>
  );
}

/** Desktop: a vertical nav in the left column, with Snap as the hero action. */
export function SideNav({ tab, onTab, onSnap }: NavProps) {
  const snapping = useFeed((s) => s.snapping);

  return (
    <nav className="glass-border rounded-card bg-surface p-2 shadow-card">
      <SideButton testId="tab-feed" active={tab === "feed"} onClick={() => onTab("feed")} label="Feed">
        <LayoutList className="size-[18px]" />
      </SideButton>
      <SideButton testId="tab-outbox" active={tab === "outbox"} onClick={() => onTab("outbox")} label="Outbox" badge={<OutboxBadge />}>
        <Inbox className="size-[18px]" />
      </SideButton>

      <button
        type="button"
        data-testid="tab-snap"
        onClick={onSnap}
        className="group relative mt-2 flex h-14 w-full items-center gap-3 overflow-hidden rounded-[18px] bg-gradient-to-br from-accent to-violet px-3 text-left text-white shadow-[0_10px_30px_-10px_rgb(61_123_255/0.9)] transition hover:brightness-110 active:scale-[0.98]"
      >
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
          {snapping && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
          <Camera className="relative size-[18px] transition group-hover:scale-110" />
        </span>
        <span className="min-w-0">
          <span className="block text-[14.5px] leading-tight font-semibold">Snap a photo</span>
          <span className="block truncate text-[12px] leading-tight text-white/75">Muse Spark reads it, SAM 3.1 outlines it</span>
        </span>
      </button>
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
          initial={{ scale: 0.3 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 18 }}
          className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-success px-1 text-[10.5px] font-bold text-[#04140b] tabular-nums"
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

interface ButtonProps {
  testId: string;
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: ReactNode;
  children: ReactNode;
}

function DockButton({ testId, active, onClick, label, badge, children }: ButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-colors",
        active ? "text-fg" : "text-faint hover:text-muted",
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="absolute inset-0 rounded-full bg-white/[0.08]"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {children}
        {label}
        {badge}
      </span>
    </button>
  );
}

function SideButton({ testId, active, onClick, label, badge, children }: ButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium transition-colors",
        active ? "text-fg" : "text-muted hover:bg-white/[0.03] hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="side-pill"
          className="absolute inset-0 rounded-[14px] bg-white/[0.07]"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className={cn("relative", active ? "text-accent-strong" : "text-faint")}>{children}</span>
      <span className="relative flex-1 text-left">{label}</span>
      <span className="relative">{badge}</span>
    </button>
  );
}
