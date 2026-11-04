"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Pickaxe, Send, Sparkles, Wand2 } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { useRecent } from "@/components/TastePanel";
import { cn } from "@/lib/cn";
import type { TraceEvent } from "@/lib/schemas";
import { selectPreparingCount, useFeed } from "@/lib/store";

const MODELS: Record<string, { name: string; chip: string; bar: string }> = {
  "muse-spark-1.3": { name: "Muse Spark", chip: "bg-accent/15 text-accent-strong", bar: "bg-accent" },
  "muse-image-1.0": { name: "Muse Image", chip: "bg-violet/15 text-[#a78bfa]", bar: "bg-violet" },
  "sam-3.1": { name: "SAM 3.1", chip: "bg-success/15 text-success", bar: "bg-success" },
  "muse-wonder-1.0": { name: "Muse Wonder", chip: "bg-warning/15 text-warning", bar: "bg-warning" },
};
const TOOLS = { name: "Sandbox tools", chip: "bg-white/[0.07] text-muted", bar: "bg-white/40" };
const modelInfo = (model: string) => MODELS[model] ?? (model === "sandbox" ? TOOLS : { ...TOOLS, name: model });

const STAGES = [
  { id: "miner", label: "Miner", icon: Pickaxe },
  { id: "preparers", label: "Preparers", icon: Wand2 },
  { id: "ranker", label: "Ranker", icon: Sparkles },
  { id: "executor", label: "Executor", icon: Send },
] as const;
type Stage = (typeof STAGES)[number]["id"] | "idle";

const MAX_BAR_MS = 12_000;

const minerCount = (s: { traces: TraceEvent[] }) => s.traces.filter((t) => t.step.startsWith("Miner")).length;

/**
 * True once the Miner of the batch in flight has reported back. Placeholders appear before it
 * answers (scanning skeletons), so "preparing > 0" alone would light the Preparers too early.
 */
export function useMinerDone() {
  const loading = useFeed((s) => s.loading);
  const calls = useFeed(minerCount);
  const [base, setBase] = useState({ loading, calls });
  if (loading !== base.loading) setBase({ loading, calls });
  return !loading || calls > base.calls;
}

/** Under the hood: every model call, live, plus the pipeline stage that is running. */
export function AgentLens({ className, compact }: { className?: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  const traces = useFeed((s) => s.traces);
  const preparing = useFeed(selectPreparingCount);
  const busy = useFeed((s) => s.loading || s.snapping);
  const snapping = useFeed((s) => s.snapping);
  const sending = useFeed((s) => s.outbox.some((e) => e.state === "sending"));
  const ranking = useRecent(useFeed((s) => s.lastTuned?.at), 1400);
  const mined = useMinerDone();

  const stage: Stage = sending
    ? "executor"
    : preparing > 0 && mined
      ? "preparers"
      : busy || preparing > 0
        ? "miner"
        : ranking
          ? "ranker"
          : "idle";

  const calls = traces.length;
  const avg = calls ? Math.round(traces.reduce((sum, t) => sum + t.ms, 0) / calls) : 0;
  const models = new Set(traces.map((t) => t.model).filter((m) => m in MODELS)).size;

  return (
    <div data-testid="agent-lens" className={cn("flex min-h-0 flex-col", className)}>
      <div className={cn("flex items-center gap-2", compact && "hidden")}>
        <span className="relative flex size-2">
          {stage !== "idle" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-strong opacity-70" />}
          <span className={cn("relative inline-flex size-2 rounded-full", stage !== "idle" ? "bg-accent-strong" : "bg-success")} />
        </span>
        <h2 className="text-[13px] font-semibold text-fg">Agent Lens</h2>
        <span className="text-[12px] text-faint">· every model call, live</span>
      </div>

      <div className={cn("grid grid-cols-3 gap-2", !compact && "mt-3")}>
        <Counter label="Calls" value={String(calls)} />
        <Counter label="Avg latency" value={avg ? `${(avg / 1000).toFixed(1)}s` : "–"} />
        <Counter label="Models" value={String(models)} />
      </div>

      <Pipeline stage={stage} />

      <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
        <AnimatePresence initial={false}>
          {stage !== "idle" && (
            <motion.li
              key={`running-${stage}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <RunningRow stage={stage} preparing={preparing} snapping={snapping} />
            </motion.li>
          )}
        </AnimatePresence>
        {traces.length === 0 && stage === "idle" && (
          <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[12.5px] text-faint">
            Model calls will stream in here as your agents work.
          </li>
        )}
        <AnimatePresence initial={false}>
          {traces.map((t) => (
            <motion.li
              key={t.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              className="relative"
            >
              <TraceRow trace={t} />
              {!reduce && Date.now() - t.at < 4000 && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl bg-accent/10 ring-1 ring-accent/50"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                />
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
      <motion.p key={value} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-mono text-[16px] font-medium text-fg tabular-nums">
        {value}
      </motion.p>
      <p className="text-[11px] text-faint">{label}</p>
    </div>
  );
}

function Pipeline({ stage }: { stage: Stage }) {
  const activeIndex = STAGES.findIndex((s) => s.id === stage);
  return (
    <div className="mt-3 flex items-center rounded-2xl border border-line bg-white/[0.02] p-2" data-testid="pipeline" data-stage={stage}>
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        const active = i === activeIndex;
        const done = activeIndex > 0 && i < activeIndex && s.id !== "ranker";
        return (
          <Fragment key={s.id}>
            {i > 0 && (
              <div className="relative mx-1 h-px flex-1 overflow-hidden bg-line-strong">
                {active && (
                  <motion.span
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-accent-strong to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
            )}
            <div
              className={cn(
                "flex shrink-0 flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 transition-colors duration-300",
                active ? "text-accent-strong" : done ? "text-success" : "text-faint",
              )}
            >
              <span
                className={cn(
                  "relative grid size-7 place-items-center rounded-lg transition-all duration-300",
                  active ? "scale-110 bg-accent-soft shadow-glow" : done ? "bg-success/10" : "bg-white/[0.04]",
                )}
              >
                {active && (
                  <span className="absolute inset-0 animate-ping rounded-lg bg-accent/20 [animation-duration:1.6s]" aria-hidden />
                )}
                {done ? <Check className="relative size-3.5" strokeWidth={3} /> : <Icon className="relative size-3.5" />}
              </span>
              <span className="text-[10.5px] font-medium">{s.label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function TraceRow({ trace }: { trace: TraceEvent }) {
  const info = modelInfo(trace.model);
  const statusDot = trace.status === "error" ? "bg-danger" : trace.status === "mock" ? "bg-faint" : "bg-success";
  const width = Math.max(4, Math.min(100, (trace.ms / MAX_BAR_MS) * 100));

  return (
    <div data-testid="trace-row" data-model={trace.model} className="rounded-xl border border-line bg-surface px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full", statusDot)} title={trace.status} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg">{trace.step}</span>
        <span className="font-mono text-[11.5px] text-muted tabular-nums">{trace.ms.toLocaleString()} ms</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={cn("flex shrink-0 items-center gap-1 rounded-md px-1.5 py-px text-[10.5px] font-semibold", info.chip)}>
          <span className={cn("size-1 rounded-full", info.bar)} />
          {info.name}
        </span>
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            className={cn("h-full rounded-full opacity-80", info.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        {trace.tokens !== undefined && (
          <span className="shrink-0 font-mono text-[10.5px] text-faint tabular-nums">{trace.tokens.toLocaleString()} tok</span>
        )}
        {trace.status === "mock" && <span className="shrink-0 text-[10.5px] text-faint">mock</span>}
      </div>
      {trace.status === "error" && trace.detail && <p className="mt-1 truncate text-[11.5px] text-danger">{trace.detail}</p>}
    </div>
  );
}

const RUNNING: Record<Exclude<Stage, "idle">, (preparing: number) => { step: string; model: string }> = {
  miner: () => ({ step: "Miner · reading inbox, calendar, sales", model: "muse-spark-1.3" }),
  preparers: (n) => ({ step: `Preparers · drafting ${n} card${n === 1 ? "" : "s"}`, model: "muse-spark-1.3" }),
  ranker: () => ({ step: "Ranker · re-scoring with your taste", model: "sandbox" }),
  executor: () => ({ step: "Executor · running the approved action", model: "sandbox" }),
};

/** The call in flight: a ticking timer and an indeterminate bar, so the Lens never looks frozen. */
function RunningRow({ stage, preparing, snapping }: { stage: Exclude<Stage, "idle">; preparing: number; snapping: boolean }) {
  const { step, model } =
    snapping && stage !== "executor"
      ? { step: "Snap · Spark reads it, SAM 3.1 outlines it", model: "sam-3.1" }
      : RUNNING[stage](preparing);
  const info = modelInfo(model);
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  return (
    <div data-testid="trace-running" className="rounded-xl border border-accent/30 bg-accent-soft/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-strong opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent-strong" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg">{step}</span>
        <span className="font-mono text-[11.5px] text-accent-strong tabular-nums">{((now - started) / 1000).toFixed(1)} s</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={cn("flex shrink-0 items-center gap-1 rounded-md px-1.5 py-px text-[10.5px] font-semibold", info.chip)}>
          <span className={cn("size-1 rounded-full", info.bar)} />
          {info.name}
        </span>
        <div className="skeleton h-1 min-w-0 flex-1 rounded-full" />
        <span className="shrink-0 text-[10.5px] text-accent-strong">running</span>
      </div>
    </div>
  );
}
