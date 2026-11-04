"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, CalendarX2, CalendarCheck2, Quote } from "lucide-react";
import type { Card } from "@/lib/schemas";

type ScheduleCard = Extract<Card, { kind: "schedule" }>;

/** Parses a local ISO datetime ("2026-11-05T15:30") without timezone surprises. */
function parseLocal(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");
}

const DAY_START = 7;
const DAY_END = 19;
const TICKS = [9, 12, 15, 18];

function hourLabel(h: number) {
  return h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`;
}

export function ScheduleBody({ card }: { card: ScheduleCard }) {
  const { event, conflict, proposed, message } = card.payload;
  const reduce = useReducedMotion();
  const start = parseLocal(proposed.start);
  const end = parseLocal(proposed.end);

  const day = start?.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const range = start && end ? `${formatTime(start)} – ${formatTime(end)}` : `${proposed.start} – ${proposed.end}`;

  const toPct = (d: Date) => {
    const h = d.getHours() + d.getMinutes() / 60;
    return Math.min(100, Math.max(0, ((h - DAY_START) / (DAY_END - DAY_START)) * 100));
  };
  const left = start ? toPct(start) : 0;
  const width = start && end ? Math.max(4, toPct(end) - left) : 0;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative flex min-w-0 flex-col">
        {/* Conflict: striped, muted, clearly the thing being replaced. */}
        <div
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-warning/25 px-3.5 py-3"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgb(255 181 71 / 0.08) 0 6px, transparent 6px 12px)",
          }}
        >
          <CalendarX2 className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0">
            <div className="text-[11px] font-medium tracking-wide text-warning uppercase">Conflict</div>
            <p className="mt-0.5 break-words text-sm leading-snug text-muted">{conflict}</p>
          </div>
        </div>

        <div className="relative z-10 -my-2 flex justify-center">
          <span className="grid size-6 place-items-center rounded-full border border-line-strong bg-surface text-faint">
            <ArrowDown className="size-3.5" aria-hidden />
          </span>
        </div>

        {/* Proposal: accent, glowing, the hero. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 26 }}
          className="min-w-0 rounded-2xl border border-accent/40 bg-accent-soft px-3.5 py-3 shadow-[0_8px_30px_-12px_rgb(61_123_255/0.6)]"
        >
          <div className="flex min-w-0 items-start gap-3">
            <CalendarCheck2 className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium tracking-wide text-accent-strong uppercase">Proposed</div>
              <div className="mt-0.5 break-words text-[15px] font-semibold text-fg">{event}</div>
              <div className="mt-0.5 text-sm text-muted tabular-nums">
                {day && <span className="text-fg/90">{day}</span>}
                {day && <span className="mx-1.5 text-faint">·</span>}
                {range}
              </div>
            </div>
          </div>

          {start && end && (
            <div className="mt-3 pl-7">
              <div className="relative h-2 rounded-full bg-white/[0.06]">
                <motion.div
                  className="absolute inset-y-0 rounded-full bg-accent shadow-[0_0_12px_2px_rgb(61_123_255/0.6)]"
                  style={{ left: `${left}%`, width: `${width}%`, transformOrigin: "left" }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="relative mt-1 h-3 text-[10px] text-faint tabular-nums">
                {TICKS.map((h) => (
                  <span
                    key={h}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${((h - DAY_START) / (DAY_END - DAY_START)) * 100}%` }}
                  >
                    {hourLabel(h)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {message && (
        <div className="flex min-w-0 gap-2.5 rounded-2xl border border-line bg-elevated/60 px-3.5 py-3">
          <Quote className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
          <p className="min-w-0 whitespace-pre-line break-words text-sm leading-[1.5] text-muted">{message}</p>
        </div>
      )}
    </div>
  );
}
