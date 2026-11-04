"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Bottom sheet: spring in, drag the handle down to close, Escape closes, page scroll locked. */
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
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
              "glass-border relative flex max-h-[90dvh] w-full max-w-[560px] flex-col rounded-t-[28px] bg-surface shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.8)] md:max-h-[85dvh] md:rounded-[28px] md:shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]",
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
            <div className="shrink-0 cursor-grab touch-none px-5 pt-3 pb-3 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 md:invisible md:mb-0 md:h-0" />
              {(title || subtitle) && (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {title && <h2 className="text-[17px] font-semibold tracking-tight text-fg">{title}</h2>}
                    {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Close"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-muted transition hover:bg-white/10 hover:text-fg"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
