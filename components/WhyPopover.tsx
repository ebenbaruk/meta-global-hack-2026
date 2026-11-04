"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** "Why am I seeing this?" for sponsored cards: the reason, in plain words. */
export function WhyPopover({ brand, reason }: { brand: string; reason: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        data-testid="why-btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[12px] text-faint transition hover:text-sponsor"
      >
        <Info className="size-3.5" />
        Why am I seeing this?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            data-testid="why-popover"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="glass-border absolute top-7 left-0 z-20 w-[min(300px,calc(100vw-64px))] origin-top-left rounded-2xl bg-elevated p-4 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)]"
          >
            <p className="text-[11px] font-semibold tracking-wider text-sponsor uppercase">Sponsored by {brand}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg">{reason}</p>
            <div className="mt-3 flex gap-2 rounded-xl bg-white/[0.04] p-2.5 text-[12px] leading-snug text-muted">
              <ShieldCheck className="mt-px size-4 shrink-0 text-success" />
              Based on your plans this week, not your browsing. Dismiss to see fewer.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
