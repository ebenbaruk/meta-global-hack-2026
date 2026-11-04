"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ActionBar } from "@/components/ActionBar";
import { CardBody } from "@/components/cards/CardBody";
import { KindSticker } from "@/components/cards/KindSticker";
import { KIND_META } from "@/components/cards/kindMeta";
import { WhyPopover } from "@/components/WhyPopover";
import { cn } from "@/lib/cn";
import type { Card } from "@/lib/schemas";

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 650;
/** How long the DONE stamp shows before the card leaves. */
const APPROVE_BEAT_MS = 460;

const URGENCY = {
  3: { label: "Needs you now", dot: "bg-tangerine", pulse: true },
  2: { label: "Today", dot: "bg-lilac", pulse: false },
  1: { label: "When you can", dot: "bg-faint", pulse: false },
} as const;

/** "just now", "4 min ago", "2 h ago", "3 d ago". */
function ago(at: number) {
  const min = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** One prepared action. Swipe right to approve, left to dismiss, or use the buttons. */
export function FeedCard({
  card,
  onApprove,
  onDismiss,
  onEdit,
  onDiveIn,
}: {
  card: Card;
  onApprove: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  onDiveIn: () => void;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-6, 0, 6]);
  const [approving, setApproving] = useState(false);
  const beat = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(beat.current), []);

  /** Button approve: the DONE stamp lands first, then the card flies out (instant with reduced motion). */
  const approveWithStamp = () => {
    if (approving) return;
    if (reduce) return onApprove();
    setApproving(true);
    beat.current = setTimeout(onApprove, APPROVE_BEAT_MS);
  };
  const approveOpacity = useTransform(x, [0, SWIPE_DISTANCE], [0, 1]);
  const dismissOpacity = useTransform(x, [-SWIPE_DISTANCE, 0], [1, 0]);
  const approveWash = useTransform(x, [0, SWIPE_DISTANCE], [0, 0.22]);
  const dismissWash = useTransform(x, [-SWIPE_DISTANCE, 0], [0.12, 0]);
  const stampScale = useTransform(x, [-SWIPE_DISTANCE, 0, SWIPE_DISTANCE], [1, 0.6, 1]);

  const meta = KIND_META[card.kind];
  const urgency = URGENCY[card.urgency];
  const sponsored = card.kind === "sponsored" || !!card.sponsored;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dir = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY ? 1
      : info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY ? -1 : 0;
    if (!dir) return;
    animate(x, dir * 640, { type: "spring", velocity: info.velocity.x, stiffness: 260, damping: 34 });
    if (dir > 0) onApprove();
    else onDismiss();
  };

  return (
    <motion.article
      data-testid="feed-card"
      data-kind={card.kind}
      data-id={card.id}
      style={{ x, rotate: reduce ? 0 : rotate }}
      drag={reduce ? false : "x"}
      dragSnapToOrigin
      dragElastic={0.85}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      whileDrag={{ cursor: "grabbing", scale: 1.015 }}
      className="relative rounded-card border border-line bg-surface shadow-card select-none"
    >
      {/* The kind's "can" color as a thin band across the top. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-8 overflow-hidden rounded-t-[27px]">
        <div className={cn("h-1.5", card.kind === "task" ? "bg-line-strong" : meta.can)} />
      </div>

      {/* Swipe feedback: a wash and a sticker, proportional to the drag. */}
      <motion.div aria-hidden style={{ opacity: approveWash }} className="pointer-events-none absolute inset-0 z-10 rounded-card bg-mint" />
      <motion.div aria-hidden style={{ opacity: dismissWash }} className="pointer-events-none absolute inset-0 z-10 rounded-card bg-ink" />
      <motion.div
        aria-hidden
        style={{ opacity: approveOpacity, scale: stampScale, rotate: -10 }}
        className="typed pointer-events-none absolute top-6 left-5 z-20 rounded-full border-2 border-onpastel bg-mint px-3.5 py-1.5 text-[14px] font-bold text-onpastel shadow-[3px_3px_0_0_var(--color-onpastel)]"
      >
        {card.actionLabel.split(" ")[0] || "Approve"} ✓
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: dismissOpacity, scale: stampScale, rotate: 10 }}
        className="typed pointer-events-none absolute top-6 right-5 z-20 rounded-full border-2 border-line-strong bg-elevated px-3.5 py-1.5 text-[14px] text-ink shadow-ink"
      >
        Skip ✕
      </motion.div>

      <AnimatePresence>{approving && <DoneStamp key="done" />}</AnimatePresence>

      <header className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <KindSticker kind={card.kind} className={sponsored ? "-rotate-3" : undefined} />
          {!sponsored && (
            <span className="typed flex items-center gap-1.5 text-[10px] text-muted">
              <span className="relative flex size-2">
                {urgency.pulse && !reduce && (
                  <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", urgency.dot)} />
                )}
                <span className={cn("relative inline-flex size-2 rounded-full border border-onpastel/40", urgency.dot)} />
              </span>
              {urgency.label}
            </span>
          )}
        </div>

        <p className="typed mt-3 truncate text-[10px] text-faint">
          {sponsored ? "Paid partner · picked by your agent" : `${meta.agent} · prepared ${ago(card.createdAt)}`}
        </p>
        <h3 className="font-display mt-1 text-[24px] leading-[1.08] font-bold text-balance text-ink">{card.title}</h3>

        {card.why && <p className="mt-2 text-[14px] leading-[1.5] text-muted">{card.why}</p>}
        {sponsored && card.sponsored && (
          <div className="mt-2">
            <WhyPopover brand={card.sponsored.brand} />
          </div>
        )}

        {card.source.length > 0 && (
          <div
            className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,transparent,var(--color-ink)_16px,var(--color-ink)_calc(100%-32px),transparent)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {card.source.map((s) => (
              <span
                key={s.id}
                className="flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-line bg-elevated px-2 font-mono text-[10.5px] text-muted"
              >
                <span className="font-bold text-lilac-ink">[{s.id}]</span>
                <span className="max-w-[200px] truncate">{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="px-4 pb-4">
        <CardBody card={card} />
      </div>

      <ActionBar
        label={card.actionLabel}
        onApprove={approveWithStamp}
        onEdit={onEdit}
        onDismiss={onDismiss}
        onDiveIn={onDiveIn}
      />
    </motion.article>
  );
}

/** The approve moment: a mint wash and a rotated "DONE ✓" sticker stamped onto the card. */
function DoneStamp() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-card"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <motion.div
        className="absolute inset-0 rounded-card bg-mint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.28 }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className="font-display relative rounded-[18px] border-[2.5px] border-onpastel bg-mint px-6 py-2.5 text-[44px] leading-none font-black text-onpastel shadow-[5px_5px_0_0_var(--color-onpastel)]"
        initial={{ scale: 2.2, rotate: -22, opacity: 0 }}
        animate={{ scale: [2.2, 0.92, 1.06, 1], rotate: -9, opacity: [0, 1, 1, 1] }}
        transition={{ duration: 0.32, times: [0, 0.5, 0.78, 1], ease: "easeOut" }}
      >
        DONE ✓
      </motion.span>
    </motion.div>
  );
}
