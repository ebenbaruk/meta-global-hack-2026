"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sticker } from "@/components/ui/Sticker";

/** "Why am I seeing this?" for sponsored cards: the reason, in plain words, on an ink-outlined sticker. */
export function WhyPopover({ brand, reason }: { brand: string; reason: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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
        className="typed flex items-center gap-1.5 rounded-full py-1 text-[10px] text-muted underline decoration-line-strong/40 underline-offset-[3px] transition hover:text-ink hover:decoration-line-strong"
      >
        <Info className="size-3.5" />
        Why am I seeing this?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={`Why ${brand} is in your feed`}
            data-testid="why-popover"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.9, rotate: -4 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: reduce ? 0 : -1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 480, damping: 24 }}
            className="absolute top-9 left-0 z-20 w-[min(300px,calc(100vw-64px))] origin-top-left rounded-[20px] border-[1.5px] border-line-strong bg-surface p-4 shadow-[4px_4px_0_0_var(--color-lilac)]"
          >
            <span
              aria-hidden
              className="absolute -top-[7px] left-5 size-3 rotate-45 border-t-[1.5px] border-l-[1.5px] border-line-strong bg-surface"
            />
            <Sticker tone="yellow" rotate={-3}>
              Sponsored
            </Sticker>
            <p className="mt-2.5 font-display text-[19px] leading-tight font-extrabold text-ink">{brand}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{reason}</p>
            <div className="mt-3 flex items-start gap-2.5 rounded-[14px] bg-elevated p-2.5 text-[12.5px] leading-snug text-muted">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-onpastel bg-mint text-onpastel">
                <ShieldCheck className="size-3.5" strokeWidth={2.4} />
              </span>
              Based on your plans this week, not your browsing. Dismiss to see fewer.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
