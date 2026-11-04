"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { KIND_META } from "@/components/cards/kindMeta";
import { kindTile } from "@/components/TastePanel";
import { Button } from "@/components/ui/Button";
import { Sticker } from "@/components/ui/Sticker";
import { cn } from "@/lib/cn";
import { useFeed, type OutboxEntry } from "@/lib/store";

function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Everything the agents executed after an approve, newest first. */
export function Outbox({ onBrowse }: { onBrowse: () => void }) {
  const outbox = useFeed((s) => s.outbox);
  const now = useNow();
  const done = outbox.filter((e) => e.state === "done").length;

  return (
    <section data-testid="outbox" className="pb-[calc(env(safe-area-inset-bottom)+112px)]">
      <header className="px-1 pt-5 pb-5">
        <p className="typed text-[10.5px] text-faint">Receipts</p>
        <h1 className="mt-1 font-display text-[40px] leading-[0.95] font-black text-ink">Done for you.</h1>
        <p className="mt-2 text-[15px] text-muted">
          {outbox.length === 0
            ? "Approved actions land here, stamped."
            : `${done} action${done === 1 ? "" : "s"} executed by your agents.`}
        </p>
      </header>

      {outbox.length === 0 ? (
        <Empty onBrowse={onBrowse} />
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {outbox.map((entry) => (
              <Receipt key={entry.cardId} entry={entry} now={now} />
            ))}
          </AnimatePresence>
        </ul>
      )}
      {outbox.length > 0 && (
        <p className="typed mt-5 px-1 text-center text-[9.5px] leading-relaxed text-faint">
          Runs against Maya&apos;s sandbox tools · nothing leaves the demo
        </p>
      )}
    </section>
  );
}

function Receipt({ entry, now }: { entry: OutboxEntry; now: number }) {
  const reduce = useReducedMotion();
  const meta = KIND_META[entry.kind];
  const Icon = meta.icon;
  const sending = entry.state === "sending";

  return (
    <motion.li
      layout={!reduce}
      data-testid="outbox-item"
      data-state={entry.state}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative overflow-hidden rounded-[20px] border border-line bg-surface shadow-card"
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3.5">
        <span className={cn("grid size-10 shrink-0 -rotate-3 place-items-center rounded-[12px]", kindTile(entry.kind))}>
          <Icon className="size-[18px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug font-semibold text-ink">{entry.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{entry.detail}</p>
        </div>
      </div>
      <div className="typed mx-4 flex items-center gap-3 border-t-[1.5px] border-dashed border-line py-3 pr-24 text-[9.5px] text-faint">
        <span className="truncate">
          {entry.tool} · {sending ? "sending…" : ago(entry.at, now)}
        </span>
      </div>
      <span className="absolute right-4 bottom-2.5">
        {sending ? (
          <span aria-label="Sending">
            <Sticker tone="lilac" rotate={-3}>
              <span className="size-2.5 animate-spin rounded-full border-[1.5px] border-onpastel/30 border-t-onpastel" aria-hidden />
              Sending
            </Sticker>
          </span>
        ) : (
          <span aria-label="Done">
            <Sticker tone="mint" rotate={7}>
              Done ✓
            </Sticker>
          </span>
        )}
      </span>
    </motion.li>
  );
}

function Empty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-card border-[1.5px] border-dashed border-line px-6 pt-8 pb-8 text-center">
      <Image src="/brand/mascot-coffee.webp" alt="" width={176} height={176} className="[filter:drop-shadow(0_0_1px_var(--ink))_drop-shadow(0_0_1px_var(--ink))] -mt-2 size-44" priority />
      <h2 className="mt-4 font-display text-[26px] leading-none font-black text-ink">Nothing sent yet</h2>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-muted">
        Approve a card and your agents do the rest. Every action comes back here with a receipt.
      </p>
      <Button onClick={onBrowse} className="mt-6">
        Go to your feed <ArrowRight className="size-4" strokeWidth={2.5} />
      </Button>
    </div>
  );
}
