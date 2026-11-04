"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { BarChart3, CalendarDays, Camera, Check, Mail, Megaphone, StickyNote, X } from "lucide-react";
import { ActionBar } from "@/components/ActionBar";
import { CardBody } from "@/components/cards/CardBody";
import { KIND_META } from "@/components/cards/kindMeta";
import { WhyPopover } from "@/components/WhyPopover";
import { cn } from "@/lib/cn";
import type { Card, SourceRef } from "@/lib/schemas";

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 650;

const SOURCE_ICON: Record<SourceRef["type"], typeof Mail> = {
  email: Mail,
  event: CalendarDays,
  sales: BarChart3,
  note: StickyNote,
  photo: Camera,
  sponsor: Megaphone,
};

const URGENCY = {
  3: { label: "Needs you now", dot: "bg-danger shadow-[0_0_8px_rgb(255_93_108/0.8)]" },
  2: { label: "Today", dot: "bg-warning" },
  1: { label: "When you can", dot: "bg-faint" },
} as const;

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
  const rotate = useTransform(x, [-240, 0, 240], [-5, 0, 5]);
  const approveOpacity = useTransform(x, [0, SWIPE_DISTANCE], [0, 1]);
  const dismissOpacity = useTransform(x, [-SWIPE_DISTANCE, 0], [1, 0]);
  const stampScale = useTransform(x, [-SWIPE_DISTANCE, 0, SWIPE_DISTANCE], [1, 0.6, 1]);

  const meta = KIND_META[card.kind];
  const Icon = meta.icon;
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
      whileDrag={{ cursor: "grabbing" }}
      className={cn(
        "glass-border relative rounded-card bg-surface shadow-card select-none",
        sponsored && "bg-[linear-gradient(180deg,rgb(245_200_106/0.06),transparent_40%)]",
      )}
    >
      {/* Swipe feedback: glow + stamp, proportional to the drag. */}
      <motion.div
        aria-hidden
        style={{ opacity: approveOpacity }}
        className="pointer-events-none absolute inset-0 z-10 rounded-card shadow-[inset_0_0_0_2px_rgb(47_212_122/0.7),0_0_40px_-6px_rgb(47_212_122/0.5)]"
      />
      <motion.div
        aria-hidden
        style={{ opacity: dismissOpacity }}
        className="pointer-events-none absolute inset-0 z-10 rounded-card shadow-[inset_0_0_0_2px_rgb(255_93_108/0.7),0_0_40px_-6px_rgb(255_93_108/0.5)]"
      />
      <motion.div
        aria-hidden
        style={{ opacity: approveOpacity, scale: stampScale }}
        className="pointer-events-none absolute top-5 left-5 z-20 flex -rotate-12 items-center gap-1.5 rounded-xl border-2 border-success bg-bg/80 px-3 py-1.5 text-sm font-bold tracking-widest text-success uppercase backdrop-blur"
      >
        <Check className="size-4" strokeWidth={3} /> {card.actionLabel.split(" ")[0] || "Approve"}
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: dismissOpacity, scale: stampScale }}
        className="pointer-events-none absolute top-5 right-5 z-20 flex rotate-12 items-center gap-1.5 rounded-xl border-2 border-danger bg-bg/80 px-3 py-1.5 text-sm font-bold tracking-widest text-danger uppercase backdrop-blur"
      >
        <X className="size-4" strokeWidth={3} /> Dismiss
      </motion.div>

      <header className="space-y-3 p-4 pb-3">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-current/12", meta.tint)}>
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[12px] text-faint">
              <span className={cn("font-medium", sponsored ? "text-sponsor" : "text-muted")}>
                {sponsored ? "Partner offer" : meta.label}
              </span>
              {!sponsored && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", urgency.dot)} />
                    {urgency.label}
                  </span>
                </>
              )}
              {sponsored && (
                <span className="rounded-full border border-sponsor/30 bg-sponsor/10 px-2 py-px text-[10.5px] font-semibold tracking-wide text-sponsor uppercase">
                  Sponsored
                </span>
              )}
            </div>
            <h3 className="mt-0.5 text-[16.5px] leading-snug font-semibold tracking-tight text-fg">{card.title}</h3>
          </div>
        </div>

        {card.why && <p className="text-[13.5px] leading-relaxed text-muted">{card.why}</p>}
        {sponsored && card.sponsored && <WhyPopover brand={card.sponsored.brand} reason={card.sponsored.reason} />}

        {card.source.length > 0 && (
          <div
            className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {card.source.map((s) => {
              const SourceIcon = SOURCE_ICON[s.type] ?? StickyNote;
              return (
                <span
                  key={s.id}
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-2.5 text-[12px] text-muted"
                >
                  <SourceIcon className="size-3.5 text-faint" />
                  <span className="max-w-[200px] truncate">{s.label}</span>
                </span>
              );
            })}
          </div>
        )}
      </header>

      <div className="px-4 pb-4">
        <CardBody card={card} />
      </div>

      <ActionBar
        label={card.actionLabel}
        sponsored={sponsored}
        onApprove={onApprove}
        onEdit={onEdit}
        onDismiss={onDismiss}
        onDiveIn={onDiveIn}
      />
    </motion.article>
  );
}
