"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Inbox, LayoutList } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFeed } from "@/lib/store";

export type Tab = "feed" | "outbox";

/** Floating dock: Feed · Snap (center, prominent) · Outbox with a badge. */
export function TabBar({ tab, onTab, onSnap }: { tab: Tab; onTab: (t: Tab) => void; onSnap: () => void }) {
  const count = useFeed((s) => s.outbox.length);
  const snapping = useFeed((s) => s.snapping);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),14px)]">
      <div className="glass-border flex items-center gap-1 rounded-full bg-elevated/80 p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)] backdrop-blur-xl">
        <TabButton testId="tab-feed" active={tab === "feed"} onClick={() => onTab("feed")} label="Feed">
          <LayoutList className="size-[18px]" />
        </TabButton>

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

        <TabButton
          testId="tab-outbox"
          active={tab === "outbox"}
          onClick={() => onTab("outbox")}
          label="Outbox"
          badge={
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
          }
        >
          <Inbox className="size-[18px]" />
        </TabButton>
      </div>
    </nav>
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
