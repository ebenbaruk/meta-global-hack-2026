"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Pickaxe, Send, Sparkles, Wand2 } from "lucide-react";
import Image from "next/image";
import { Fragment, useEffect, useState } from "react";
import { useRecent } from "@/components/TastePanel";
import { cn } from "@/lib/cn";
import type { TraceEvent } from "@/lib/schemas";
import { selectPreparingCount, useFeed } from "@/lib/store";

/** The Meta models, each with its own pastel. Pastels always carry onpastel text. */
const MODELS: Record<string, { name: string; job: string; fill: string }> = {
  "muse-spark-1.3": { name: "Muse Spark", job: "reads · drafts · learns", fill: "bg-lilac" },
  "muse-image-1.0": { name: "Muse Image", job: "paints post visuals", fill: "bg-rose" },
  "sam-3.1": { name: "SAM 3.1", job: "outlines your snaps", fill: "bg-mint" },
  "muse-wonder-1.0": { name: "Muse Wonder", job: "imagines", fill: "bg-sky" },
};
const ROSTER = ["muse-spark-1.3", "muse-image-1.0", "sam-3.1"] as const;
const TOOLS = { name: "Sandbox", job: "runs the action", fill: "bg-elevated" };
const modelInfo = (model: string) => MODELS[model] ?? (model === "sandbox" ? TOOLS : { ...TOOLS, name: model });

const STAGES = [
  { id: "miner", label: "Miner", verb: "reads", icon: Pickaxe },
  { id: "preparers", label: "Preparers", verb: "drafts", icon: Wand2 },
  { id: "ranker", label: "Ranker", verb: "sorts", icon: Sparkles },
  { id: "executor", label: "Executor", verb: "acts", icon: Send },
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

const clock = (at: number) =>
  new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

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
  const perModel = (m: string) => traces.filter((t) => t.model === m).length;
  const models = new Set(traces.map((t) => t.model).filter((m) => m in MODELS)).size;

  return (
    <div
      data-testid="agent-lens"
      className={cn(
        "flex min-h-0 flex-col",
        !compact && "rounded-card border border-line bg-surface p-4 pt-5 shadow-card",
        className,
      )}
    >
      <div className="grid grid-cols-3 divide-x divide-line">
        <Counter label="Calls" value={String(calls)} />
        <Counter label="Avg latency" value={avg ? (avg / 1000).toFixed(1) : "–"} unit={avg ? "s" : undefined} />
        <Counter label="Models" value={String(models)} />
      </div>

      <ul className="mt-4 space-y-1.5" aria-label="Meta models on duty">
        {ROSTER.map((m) => (
          <ModelRow key={m} model={m} count={perModel(m)} />
        ))}
      </ul>

      <Pipeline stage={stage} />

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-line bg-elevated">
        <div className="typed flex shrink-0 items-center justify-between border-b border-dashed border-line px-3 py-2 text-[9.5px] text-faint">
          <span className="flex items-center gap-2">
            <LiveDot on={stage !== "idle"} /> call log
          </span>
          <span>{stage === "idle" ? "idle" : `${stage} running`}</span>
        </div>
        <ul className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5">
          <AnimatePresence initial={false}>
            {stage !== "idle" && (
              <motion.li
                key="running"
                initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <RunningRow key={stage} stage={stage} preparing={preparing} snapping={snapping} />
              </motion.li>
            )}
          </AnimatePresence>
          {traces.length === 0 && stage === "idle" && (
            <li className="flex flex-col items-center px-3 py-6 text-center font-mono text-[11.5px] leading-relaxed text-muted">
              <Image src="/brand/mascot-scan.webp" alt="" width={96} height={96} className="[filter:drop-shadow(0_0_1px_var(--ink))_drop-shadow(0_0_1px_var(--ink))] mb-2 size-24" />
              <span>
                &gt; waiting for the first call
                <Caret />
              </span>
            </li>
          )}
          <AnimatePresence initial={false}>
            {traces.map((t) => (
              <motion.li
                key={t.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="relative"
              >
                <TraceRow trace={t} />
                {!reduce && Date.now() - t.at < 4000 && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[12px] bg-lilac/30"
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
    </div>
  );
}

function LiveDot({ on }: { on: boolean }) {
  return (
    <span className="relative flex size-2" aria-hidden>
      {on && <span className="absolute inline-flex size-full animate-ping rounded-full bg-lilac opacity-80" />}
      <span className={cn("relative inline-flex size-2 rounded-full border border-onpastel", on ? "bg-lilac" : "bg-mint")} />
    </span>
  );
}

function Caret() {
  return <span aria-hidden className="ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse bg-lilac-ink" />;
}

function Counter({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="px-3 first:pl-0">
      <motion.p
        key={value}
        initial={reduce ? false : { opacity: 0.3, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[34px] leading-none font-black text-ink tabular-nums"
      >
        {value}
        {unit && <span className="ml-0.5 text-[18px] text-muted">{unit}</span>}
      </motion.p>
      <p className="typed mt-1.5 text-[9.5px] text-muted">{label}</p>
    </div>
  );
}

/** One Meta model on duty: its id on its pastel, what it does here, how many calls it made. */
function ModelRow({ model, count }: { model: string; count: number }) {
  const info = modelInfo(model);
  return (
    <li data-testid="model-row" data-model={model} className="flex items-center gap-2.5">
      <span
        className={cn(
          "shrink-0 rounded-full border-[1.5px] border-onpastel px-2.5 py-[3px] font-mono text-[10.5px] font-bold text-onpastel",
          info.fill,
        )}
      >
        {model}
      </span>
      <span className="typed min-w-0 flex-1 truncate text-[9.5px] text-muted">{info.job}</span>
      <motion.span
        key={count}
        initial={{ scale: 1.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className={cn("font-display text-[18px] leading-none font-black tabular-nums", count ? "text-ink" : "text-faint")}
      >
        ×{count}
      </motion.span>
    </li>
  );
}

function Pipeline({ stage }: { stage: Stage }) {
  const reduce = useReducedMotion();
  const activeIndex = STAGES.findIndex((s) => s.id === stage);
  return (
    <div className="mt-3 flex items-start px-0.5" data-testid="pipeline" data-stage={stage}>
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        const active = i === activeIndex;
        const done = activeIndex > 0 && i < activeIndex && s.id !== "ranker";
        return (
          <Fragment key={s.id}>
            {i > 0 && (
              <div className="relative mt-[19px] h-0 min-w-2 flex-1 border-t-[1.5px] border-dashed border-line-strong">
                {active && !reduce && (
                  <motion.span
                    aria-hidden
                    className="absolute -top-[4.5px] size-[7px] rounded-full border border-onpastel bg-yellow"
                    initial={{ left: "0%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
            )}
            <div className="flex w-[60px] shrink-0 flex-col items-center gap-1">
              <motion.span
                animate={reduce ? undefined : { scale: active ? 1.08 : 1, rotate: active ? -4 : 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className={cn(
                  "grid size-10 place-items-center rounded-[12px] border-[1.5px] transition-colors duration-300",
                  active
                    ? "border-onpastel bg-lilac text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)]"
                    : done
                      ? "border-onpastel bg-mint text-onpastel"
                      : "border-line-strong bg-surface text-ink",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" strokeWidth={2.2} />}
              </motion.span>
              <span className={cn("text-[11.5px] leading-tight font-semibold", active ? "text-ink" : "text-muted")}>{s.label}</span>
              <span className="typed -mt-0.5 text-[8.5px] text-faint">{s.verb}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function TraceRow({ trace }: { trace: TraceEvent }) {
  const info = modelInfo(trace.model);
  const width = Math.max(4, Math.min(100, (trace.ms / MAX_BAR_MS) * 100));
  const status =
    trace.status === "error"
      ? { label: "err", cls: "text-danger" }
      : trace.status === "mock"
        ? { label: "mock", cls: "text-faint" }
        : { label: "ok", cls: "text-ink" };

  return (
    <div data-testid="trace-row" data-model={trace.model} className="rounded-[12px] px-2 py-2 font-mono">
      <div className="flex items-center gap-2 text-[10.5px]">
        <span className="shrink-0 text-faint tabular-nums">{clock(trace.at)}</span>
        <span className="min-w-0 flex-1 truncate font-bold text-ink">{trace.step}</span>
        <span className={cn("shrink-0 font-bold uppercase", status.cls)}>
          {trace.status === "ok" ? "✓ " : ""}
          {status.label}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className={cn(
            "shrink-0 rounded-[6px] border px-1.5 py-px text-[9.5px] font-bold",
            info.fill,
            info.fill === TOOLS.fill ? "border-line-strong text-ink" : "border-onpastel text-onpastel",
          )}
        >
          {trace.model}
        </span>
        <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-ink/70"
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <span className="shrink-0 text-[10px] text-muted tabular-nums">{trace.ms.toLocaleString("en-US")}ms</span>
        {trace.tokens !== undefined && (
          <span className="shrink-0 text-[10px] text-faint tabular-nums">{trace.tokens.toLocaleString("en-US")}t</span>
        )}
      </div>
      {trace.status === "error" && trace.detail && <p className="mt-1 truncate text-[10.5px] text-danger">! {trace.detail}</p>}
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
  const reduce = useReducedMotion();
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      data-testid="trace-running"
      className="mb-1 rounded-[12px] border-[1.5px] border-onpastel bg-lilac px-2 py-2 font-mono text-onpastel"
    >
      <div className="flex items-center gap-2 text-[10.5px]">
        <span className="shrink-0 font-bold">&gt;</span>
        <span className="min-w-0 flex-1 truncate font-bold">
          {step}
          <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-pulse bg-onpastel" />
        </span>
        <span className="shrink-0 font-bold tabular-nums">{((now - started) / 1000).toFixed(1)}s</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="shrink-0 rounded-[6px] border border-onpastel bg-surface px-1.5 py-px text-[9.5px] font-bold text-ink">
          {model === "sandbox" ? info.name.toLowerCase() : model}
        </span>
        <div className="relative h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-onpastel/20">
          <motion.span
            className="absolute inset-y-0 w-1/3 rounded-full bg-onpastel"
            initial={{ left: "-33%" }}
            animate={reduce ? { left: "33%" } : { left: ["-33%", "100%"] }}
            transition={reduce ? { duration: 0 } : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase">running</span>
      </div>
    </div>
  );
}
