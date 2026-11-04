"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Card } from "@/lib/schemas";
import { Sparkline } from "./Sparkline";

type TeamUpdateCard = Extract<Card, { kind: "team_update" }>;

function deltaTone(delta: string) {
  const d = delta.trim();
  if (d.startsWith("-") || d.startsWith("−")) return "down";
  if (d.startsWith("+")) return "up";
  return "flat";
}

/** A mint scoreboard (metrics + sparkline in ink), then the message as it will land in the channel. */
export function TeamUpdateBody({ card }: { card: TeamUpdateCard }) {
  const { channel, message, metrics, series } = card.payload;
  const reduce = useReducedMotion();
  const channelName = channel.replace(/^#/, "");
  const shown = metrics.slice(0, 4);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="min-w-0 rounded-[20px] bg-mint p-4 text-onpastel">
        {shown.length > 0 && (
          <dl className="flex min-w-0 flex-col">
            {shown.map((m, i) => {
              const tone = deltaTone(m.delta);
              const [change, ...rest] = m.delta.replace(/^[+−-]/, "").split(" ");
              return (
                <motion.div
                  key={m.label}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i, type: "spring", stiffness: 320, damping: 28 }}
                  className="flex min-w-0 items-baseline gap-2 border-b border-dashed border-onpastel/25 py-2 first:pt-0"
                >
                  <dt className="typed min-w-0 flex-1 truncate text-[10px] opacity-75">{m.label}</dt>
                  <span
                    className="shrink-0 rounded-full border border-onpastel/50 px-1.5 py-0.5 font-mono text-[10.5px] font-bold tabular-nums"
                    title={m.delta}
                  >
                    {tone === "up" ? "▲ " : tone === "down" ? "▼ " : ""}
                    {change}
                    {rest.length > 0 && <span className="font-normal opacity-70"> {rest.join(" ").replace(/-day avg$/, "d")}</span>}
                  </span>
                  <dd className="font-display shrink-0 text-right text-[26px] leading-none font-black tabular-nums">{m.value}</dd>
                </motion.div>
              );
            })}
          </dl>
        )}

        {series.length > 1 && (
          <div className="mt-3">
            <div className="typed flex items-center justify-between text-[9.5px] opacity-75">
              <span>Last {series.length} days</span>
              <span className="tabular-nums">Peak ${Math.round(Math.max(...series)).toLocaleString("en-US")}</span>
            </div>
            <Sparkline values={series} color="var(--color-onpastel)" height={52} className="mt-2" />
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-[20px] border border-line bg-elevated p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11.5px] font-bold text-ink">#{channelName}</span>
          <span className="typed text-[9.5px] text-faint">Ready to post as you</span>
        </div>
        <p className="mt-2 whitespace-pre-line break-words text-[14.5px] leading-[1.55] text-ink">{message}</p>
      </div>
    </div>
  );
}
