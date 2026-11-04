"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
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

/** "… (10:30–11:30)" → [10.5, 11.5]. Small hours are afternoon (a café's day). */
function parseRange(text: string): [number, number] | null {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|pm)?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!m) return null;
  const h = (hh: string, mm?: string) => {
    const v = +hh + (mm ? +mm / 60 : 0);
    return v < 7 ? v + 12 : v;
  };
  const a = h(m[1], m[2]);
  const b = h(m[3], m[4]);
  return b > a ? [a, b] : null;
}

const DAY_START = 8;
const DAY_END = 18;
const TICKS = [8, 10, 12, 14, 16, 18];
const pct = (h: number) => Math.min(100, Math.max(0, ((h - DAY_START) / (DAY_END - DAY_START)) * 100));
const hourLabel = (h: number) => (h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`);

const STRIPES = {
  backgroundImage: "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-onpastel) 14%, transparent) 0 5px, transparent 5px 11px)",
};

/** The clash (tangerine, striped) and the fix (ink-outlined ticket), plus a day strip proving they no longer overlap. */
export function ScheduleBody({ card }: { card: ScheduleCard }) {
  const { event, conflict, proposed, message } = card.payload;
  const reduce = useReducedMotion();
  const start = parseLocal(proposed.start);
  const end = parseLocal(proposed.end);
  const clash = parseRange(conflict);

  const day = start?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const range = start && end ? `${formatTime(start)} – ${formatTime(end)}` : `${proposed.start} – ${proposed.end}`;
  const hours = (d: Date) => d.getHours() + d.getMinutes() / 60;

  return (
    <div className="flex min-w-0 flex-col">
      {/* The clash */}
      <div className="relative min-w-0 rounded-[20px] bg-tangerine px-4 pt-3.5 pb-4 text-onpastel" style={STRIPES}>
        <span className="typed inline-flex -rotate-3 items-center rounded-full border-[1.5px] border-onpastel bg-surface px-2 py-1 text-[9.5px] leading-none font-bold text-ink">
          Clash ✺
        </span>
        <p className="mt-2 text-[14px] leading-snug font-medium break-words">{conflict}</p>
      </div>

      <div className="relative z-10 -my-3 flex justify-center">
        <span className="grid size-8 place-items-center rounded-full border-[1.5px] border-line-strong bg-yellow text-onpastel">
          <ArrowDown className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
      </div>

      {/* The fix */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 24 }}
        className="min-w-0 rounded-[20px] border-[1.5px] border-line-strong bg-surface px-4 pt-4 pb-3.5 shadow-ink"
      >
        <div className="typed text-[10px] text-lilac-ink">Moved to · {day}</div>
        <div className="font-display mt-1 text-[30px] leading-none font-black text-ink tabular-nums">{range}</div>
        <div className="mt-1.5 text-[14px] leading-snug break-words text-muted">{event}</div>

        {start && end && (
          <div className="mt-3.5">
            <div className="relative h-5 rounded-full border border-line bg-elevated">
              {clash && (
                <div
                  className="absolute inset-y-0.5 rounded-full bg-tangerine"
                  style={{ left: `${pct(clash[0])}%`, width: `${pct(clash[1]) - pct(clash[0])}%`, ...STRIPES }}
                  title="The other commitment"
                />
              )}
              <motion.div
                className="absolute inset-y-0.5 rounded-full border-[1.5px] border-onpastel bg-lilac"
                style={{ left: `${pct(hours(start))}%`, width: `${Math.max(4, pct(hours(end)) - pct(hours(start)))}%`, transformOrigin: "left" }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="relative mt-1 h-3 font-mono text-[9.5px] text-faint tabular-nums">
              {TICKS.map((h, i) => (
                <span
                  key={h}
                  className={i === 0 ? "absolute" : i === TICKS.length - 1 ? "absolute -translate-x-full" : "absolute -translate-x-1/2"}
                  style={{ left: `${pct(h)}%` }}
                >
                  {hourLabel(h)}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {message && (
        <div className="mt-3 min-w-0 rounded-[20px] border border-line bg-elevated px-4 py-3">
          <div className="typed text-[9.5px] text-faint">Note they&apos;ll get</div>
          <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-[1.5] text-ink">{message}</p>
        </div>
      )}
    </div>
  );
}
