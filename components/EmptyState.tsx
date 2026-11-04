"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

/** A designed empty state: Ford the mascot (or an icon sticker) on a yellow disc, a chunky title, one line, an optional action. */
export function EmptyState({
  icon: Icon,
  art,
  kicker,
  sticker,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  /** A brand illustration from /public/brand, shown instead of the icon. */
  art?: string;
  /** A typed label above the title. */
  kicker?: string;
  /** A rotated mint sticker on the disc, e.g. "All clear". */
  sticker?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div data-testid="empty-state" className="flex flex-col items-center px-6 pt-10 pb-16 text-center">
      <motion.div
        className="relative mb-7"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <div className="grid size-44 place-items-center rounded-full border-[1.5px] border-onpastel bg-yellow shadow-[4px_4px_0_0_var(--color-onpastel)]">
          {art ? (
            <motion.div
              animate={reduce ? undefined : { y: [0, -4, 0], rotate: [0, -1.5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image src={art} alt="" width={168} height={168} className="size-40 select-none" draggable={false} />
            </motion.div>
          ) : (
            <Icon className="size-14 text-onpastel" strokeWidth={1.75} />
          )}
        </div>
        {sticker && (
          <span
          aria-hidden
          className="typed absolute -top-1 -right-4 rotate-12 rounded-full border-[1.5px] border-onpastel bg-mint px-2.5 py-1 text-[10px] leading-none font-bold text-onpastel"
        >
          {sticker}
          </span>
        )}
      </motion.div>
      {kicker && <p className="typed text-[10.5px] text-faint">{kicker}</p>}
      <h2 className="font-display mt-1.5 text-[34px] leading-[0.98] font-black text-balance text-ink">{title}</h2>
      <p className="mt-3 max-w-[290px] text-[15px] leading-[1.5] text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
