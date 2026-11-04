"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Hash, UserRound } from "lucide-react";
import type { Card } from "@/lib/schemas";
import { Sparkline } from "./Sparkline";

type TeamUpdateCard = Extract<Card, { kind: "team_update" }>;

function deltaTone(delta: string) {
  const d = delta.trim();
  if (d.startsWith("-") || d.startsWith("−")) return "down";
  if (d.startsWith("+")) return "up";
  return "flat";
}

export function TeamUpdateBody({ card }: { card: TeamUpdateCard }) {
  const { channel, message, metrics, series } = card.payload;
  const reduce = useReducedMotion();
  const channelName = channel.replace(/^#/, "");
  const trendUp = series.length < 2 || series[series.length - 1] >= series[0];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {metrics.length > 0 && (
        <div className="grid min-w-0 gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)}, minmax(0, 1fr))` }}>
          {metrics.slice(0, 3).map((m, i) => {
            const tone = deltaTone(m.delta);
            return (
              <motion.div
                key={m.label}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 320, damping: 28 }}
                className="min-w-0 rounded-2xl border border-line bg-elevated/60 px-3 py-2.5"
              >
                <div className="truncate text-[11px] font-medium tracking-wide text-muted uppercase">{m.label}</div>
                <div className="mt-1 truncate text-xl font-semibold tracking-tight text-fg tabular-nums">{m.value}</div>
                <div
                  className={`mt-0.5 inline-flex max-w-full items-center gap-0.5 text-xs font-medium tabular-nums ${
                    tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-muted"
                  }`}
                >
                  {tone === "up" && <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />}
                  {tone === "down" && <ArrowDownRight className="size-3.5 shrink-0" aria-hidden />}
                  <span className="truncate">{m.delta}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {series.length > 1 && (
        <div className="rounded-2xl border border-line bg-elevated/60 px-3 pt-2.5 pb-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted">
            <span>Last {series.length} days</span>
            <span className="tabular-nums">peak {Math.max(...series).toLocaleString("en-US")}</span>
          </div>
          <Sparkline
            values={series}
            color={trendUp ? "var(--color-success)" : "var(--color-danger)"}
            height={56}
            className="mt-1.5"
          />
        </div>
      )}

      <div className="min-w-0 rounded-2xl border border-line bg-elevated/60 p-3">
        <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-xs font-medium text-muted">
          <Hash className="size-3" aria-hidden />
          {channelName}
        </div>
        <div className="flex min-w-0 gap-2.5">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-violet text-white"
          >
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-fg">You</span>
              <span className="text-[11px] text-faint">ready to post</span>
            </div>
            <p className="mt-0.5 whitespace-pre-line break-words text-[14px] leading-[1.5] text-muted">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
