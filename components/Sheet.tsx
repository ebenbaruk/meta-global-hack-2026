"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { lockAppScroll } from "@/components/DeviceFrame";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet: springs in, drag the handle down to close, Escape closes, app scroll locked.
 * Always a bottom sheet (no breakpoints): on desktop it lives inside the phone screen.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  testId,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const unlock = lockAppScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-onpastel/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            data-testid={testId}
            className={cn(
              "relative flex max-h-[92%] w-full max-w-[560px] flex-col rounded-t-[32px] border border-b-0 border-line bg-surface shadow-pop",
              className,
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag={reduce ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className="shrink-0 cursor-grab touch-none px-5 pt-2.5 pb-4 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-faint/40" />
              {(title || subtitle) && (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {title && <h2 className="font-display text-[24px] leading-[1.05] font-extrabold text-ink">{title}</h2>}
                    {subtitle && <p className="mt-1 truncate text-[13px] text-muted">{subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Close"
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-elevated text-ink transition hover:border-line-strong"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(var(--safe-bottom,0px),16px)]">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
