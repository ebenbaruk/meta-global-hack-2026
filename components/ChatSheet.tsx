"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowUp, Check, RotateCcw, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KIND_META } from "@/components/cards/kindMeta";
import { kindTile } from "@/components/TastePanel";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { Sticker } from "@/components/ui/Sticker";
import { lockAppScroll } from "@/components/DeviceFrame";
import { cn } from "@/lib/cn";
import type { Card, TraceEvent } from "@/lib/schemas";
import { useFeed } from "@/lib/store";

type Payload = Card["payload"];

type Entry =
  | { id: string; type: "text"; role: "user" | "assistant"; content: string }
  | {
      id: string;
      type: "revision";
      instruction: string;
      status: "loading" | "ready" | "error";
      before: string;
      payload?: Payload;
      applied?: boolean;
    };

const STARTERS = [
  { label: "Why this?", prompt: "Why is this in my feed?" },
  { label: "Make it shorter", revise: "Make it shorter" },
  { label: "More formal", revise: "More formal" },
  { label: "What if I say no?", prompt: "What happens if I pass on this card and do nothing?" },
] as const;

const SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;
let entrySeq = 0;
const newId = () => `m${++entrySeq}`;

/** The text a revision changes, used for the inline preview. */
function draftText(card: Card, payload: Payload = card.payload): string {
  const p = payload as Record<string, unknown>;
  switch (card.kind) {
    case "email_reply":
      return String(p.body ?? "");
    case "team_update":
    case "schedule":
      return String(p.message ?? "");
    case "social_post":
      return String(p.caption ?? "");
    case "insight":
      return String(p.detail ?? "");
    case "task":
      return (p.steps as string[] | undefined)?.map((s, i) => `${i + 1}. ${s}`).join("\n") ?? "";
    default:
      return JSON.stringify(payload);
  }
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function ChatSheet({
  card,
  open,
  onClose,
  onRevise,
}: {
  card: Card | null;
  open: boolean;
  onClose: () => void;
  onRevise: (payload: Card["payload"]) => void;
}) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const unlock = lockAppScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && card && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close chat"
            className="absolute inset-0 cursor-default bg-onpastel/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={`Dive in: ${card.title}`}
            data-testid="chat-sheet"
            className="relative flex h-[calc(100%-max(env(safe-area-inset-top),44px)-12px)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[32px] border-[1.5px] border-b-0 border-line-strong bg-surface shadow-pop"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : SPRING}
            drag={reduce ? false : "y"}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <ChatBody key={card.id} card={card} onClose={onClose} onRevise={onRevise} dragControls={dragControls} />
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}

function ChatBody({
  card,
  onClose,
  onRevise,
  dragControls,
}: {
  card: Card;
  onClose: () => void;
  onRevise: (payload: Payload) => void;
  dragControls: ReturnType<typeof useDragControls>;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const meta = KIND_META[card.kind];
  const Icon = meta.icon;
  const last = entries.at(-1);
  const waiting = busy && last?.type === "text" && last.role === "user";
  const streamingId = busy && last?.type === "text" && last.role === "assistant" ? last.id : null;

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [entries, busy]);

  const update = (id: string, patch: (e: Entry) => Entry) =>
    setEntries((list) => list.map((e) => (e.id === id ? patch(e) : e)));

  /** Conversation as the API sees it: revisions become a short assistant note. */
  const history = (list: Entry[]) =>
    list.flatMap((e) => {
      if (e.type === "text") return e.content ? [{ role: e.role, content: e.content }] : [];
      if (e.status !== "ready" || !e.payload) return [];
      return [{ role: "assistant" as const, content: `Revised draft (${e.instruction}):\n${draftText(card, e.payload)}` }];
    });

  async function ask(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const user: Entry = { id: newId(), type: "text", role: "user", content };
    const next = [...entries, user];
    setEntries(next);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    const replyId = newId();
    const started = Date.now();
    let res: Response | undefined;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, messages: history(next) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setEntries((list) =>
          list.some((e) => e.id === replyId)
            ? list.map((e) => (e.id === replyId && e.type === "text" ? { ...e, content: reply } : e))
            : [...list, { id: replyId, type: "text", role: "assistant", content: reply }],
        );
      }
      traceChat(res, started, "ok");
    } catch {
      if (controller.signal.aborted) return;
      traceChat(res, started, "error");
      setEntries((list) => [
        ...list.filter((e) => e.id !== replyId),
        { id: replyId, type: "text", role: "assistant", content: "I couldn't reach the model just now. Try again?" },
      ]);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function traceChat(res: Response | undefined, started: number, status: "ok" | "error") {
    const mock = res?.headers.get("X-Model-Mode") === "mock";
    useFeed.getState().trace([
      {
        id: `chat-${newId()}`,
        step: `Dive in · ${card.kind}`,
        model: res?.headers.get("X-Model") ?? "muse-spark-1.3",
        ms: Date.now() - started,
        status: status === "error" ? "error" : mock ? "mock" : "ok",
        at: Date.now(),
      },
    ]);
  }

  async function revise(instruction: string) {
    if (busy) return;
    const revisionId = newId();
    setEntries((list) => [
      ...list,
      { id: newId(), type: "text", role: "user", content: instruction },
      { id: revisionId, type: "revision", instruction, status: "loading", before: draftText(card) },
    ]);
    setBusy(true);
    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, instruction }),
      });
      const data = (await res.json().catch(() => ({}))) as { payload?: Payload; traces?: TraceEvent[] };
      if (data.traces?.length) useFeed.getState().trace(data.traces);
      if (!res.ok || !data.payload) throw new Error("revise failed");
      const payload = data.payload;
      update(revisionId, (e) => ({ ...e, status: "ready", payload }) as Entry);
    } catch {
      update(revisionId, (e) => ({ ...e, status: "error" }) as Entry);
    } finally {
      setBusy(false);
    }
  }

  function apply(entry: Extract<Entry, { type: "revision" }>) {
    if (!entry.payload) return;
    onRevise(entry.payload);
    update(entry.id, (e) => ({ ...e, applied: true }) as Entry);
  }

  const knows = card.source.map((s) => s.label).join(", ");

  return (
    <>
      {/* Header: drag handle + pinned card context */}
      <header
        className="shrink-0 touch-none border-b border-line px-5 pt-3 pb-4 select-none"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-line-strong/25" aria-hidden />
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 grid size-10 shrink-0 -rotate-3 place-items-center rounded-[12px]", kindTile(card.kind))}>
            <Icon className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="typed text-[10px] text-faint">Dive in · {meta.label}</p>
            <h2 className="mt-1 line-clamp-2 font-display text-[20px] leading-[1.1] font-extrabold text-balance text-ink">{card.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-elevated text-ink transition-colors hover:bg-lilac-soft"
          >
            <X className="size-4" strokeWidth={2.5} />
          </button>
        </div>
        {knows && (
          <div className="mt-3 flex min-w-0 items-center gap-2 rounded-full bg-lilac-soft py-1.5 pr-3 pl-1.5">
            <span className="typed shrink-0 rounded-full border-[1.5px] border-onpastel bg-lilac px-2 py-0.5 text-[9px] font-bold text-onpastel">
              Knows
            </span>
            <span className="truncate font-mono text-[11px] text-lilac-ink">{knows}</span>
          </div>
        )}
      </header>

      {/* Thread */}
      <div ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <div className="flex flex-col gap-3">
          <Intro card={card} />
          <AnimatePresence initial={false}>
            {entries.map((entry) =>
              entry.type === "text" ? (
                <Bubble key={entry.id} role={entry.role} content={entry.content} streaming={entry.id === streamingId} />
              ) : (
                <RevisionBlock key={entry.id} card={card} entry={entry} onApply={() => apply(entry)} onRetry={() => revise(entry.instruction)} />
              ),
            )}
            {waiting && <Typing key="typing" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Starters + composer */}
      <footer className="shrink-0 border-t border-line bg-surface pb-[max(var(--safe-bottom,0px),12px)]">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              data-testid="chat-chip"
              disabled={busy}
              onClick={() => ("revise" in s ? revise(s.revise) : ask(s.prompt))}
              className="typed flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong bg-surface px-3.5 text-[10.5px] font-bold text-ink transition-colors hover:bg-lilac-soft disabled:opacity-40"
            >
              {"revise" in s && <Wand2 className="size-3.5 text-lilac-ink" aria-hidden />}
              {s.label}
            </button>
          ))}
          <span className="w-2 shrink-0" aria-hidden />
        </div>
        <Composer value={input} onChange={setInput} onSend={() => ask(input)} disabled={busy} />
      </footer>
    </>
  );
}

function Intro({ card }: { card: Card }) {
  const draft = draftText(card);
  return (
    <div className="flex items-start gap-2.5">
      <AgentAvatar />
      <div className="max-w-[85%] space-y-3 rounded-[20px] rounded-tl-[6px] bg-elevated px-4 py-3 text-[14.5px] leading-relaxed text-muted">
        <p>
          <span className="text-ink">{card.why}</span> Ask me anything about it, or have me rework the draft.
        </p>
        {draft && (
          <div className="rounded-[14px] border border-line bg-surface px-3 py-2.5">
            <p className="typed text-[9px] text-faint">Current draft</p>
            <p className="mt-1 line-clamp-4 text-[13px] leading-relaxed whitespace-pre-line text-ink">{draft}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentAvatar() {
  return (
    <span aria-hidden className="mt-0.5 shrink-0">
      <LogoMark className="size-7" />
    </span>
  );
}

const enter = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0 },
  transition: SPRING,
};

function Bubble({ role, content, streaming }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  const user = role === "user";
  return (
    <motion.div {...enter} data-testid="chat-message" data-role={role} className={cn("flex items-start gap-2.5", user && "justify-end")}>
      {!user && <AgentAvatar />}
      <div
        className={cn(
          "max-w-[85%] rounded-[20px] px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap",
          user
            ? "rounded-tr-[6px] border-[1.5px] border-onpastel bg-lilac text-onpastel"
            : "rounded-tl-[6px] bg-elevated text-ink",
        )}
      >
        {content}
        {streaming && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.18em] animate-pulse rounded-[2px] bg-lilac-ink"
          />
        )}
      </div>
    </motion.div>
  );
}

function Typing() {
  const reduce = useReducedMotion();
  return (
    <motion.div {...enter} className="flex items-start gap-2.5" aria-label="Agent is typing">
      <AgentAvatar />
      <div className="flex items-center gap-1 rounded-[20px] rounded-tl-[6px] bg-elevated px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-lilac-ink"
            animate={reduce ? { opacity: [0.3, 1, 0.3] } : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function RevisionBlock({
  card,
  entry,
  onApply,
  onRetry,
}: {
  card: Card;
  entry: Extract<Entry, { type: "revision" }>;
  onApply: () => void;
  onRetry: () => void;
}) {
  const after = entry.payload ? draftText(card, entry.payload) : "";
  const [beforeWords, afterWords] = [wordCount(entry.before), wordCount(after)];

  return (
    <motion.div {...enter} className="flex items-start gap-2.5">
      <AgentAvatar />
      <div className="min-w-0 flex-1 overflow-hidden rounded-[20px] rounded-tl-[6px] border-[1.5px] border-line-strong bg-surface">
        {entry.status === "loading" && (
          <div className="space-y-2.5 px-4 py-3.5">
            <p className="typed flex items-center gap-2 text-[10px] text-muted">
              <Wand2 className="size-3.5 animate-pulse text-lilac-ink" aria-hidden />
              Rewriting the draft…
            </p>
            <div className="skeleton h-2.5 w-full rounded-full" />
            <div className="skeleton h-2.5 w-4/5 rounded-full" />
            <div className="skeleton h-2.5 w-3/5 rounded-full" />
          </div>
        )}

        {entry.status === "error" && (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <p className="text-[13px] text-danger">Couldn&apos;t rewrite it this time.</p>
            <button type="button" onClick={onRetry} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {entry.status === "ready" && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-line px-4 py-2.5">
              <Sticker tone="mint" rotate={-3}>
                <Check className="size-3" strokeWidth={3} aria-hidden /> New draft
              </Sticker>
              <span className="font-mono text-[10.5px] text-muted">
                {beforeWords} → {afterWords} words
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="mb-2 line-clamp-2 text-[12px] leading-relaxed text-faint line-through decoration-faint/70">
                {entry.before}
              </p>
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-ink">{after}</p>
            </div>
            <div className="px-3 pb-3">
              {entry.applied ? (
                <p
                  data-testid="chat-apply"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-onpastel bg-mint text-[15px] font-semibold text-onpastel"
                >
                  <Check className="size-4" strokeWidth={3} /> Applied to card
                </p>
              ) : (
                <Button data-testid="chat-apply" onClick={onApply} className="w-full">
                  <Wand2 className="size-4" strokeWidth={2.4} /> Apply to card
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [value]);

  return (
    <form
      className="flex items-end gap-2 px-4 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <textarea
        ref={ref}
        data-testid="chat-input"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!disabled) onSend();
          }
        }}
        placeholder="Ask about this card…"
        aria-label="Message"
        className="no-scrollbar min-h-11 flex-1 resize-none rounded-[22px] border-[1.5px] border-line bg-elevated px-4 py-[9px] text-base leading-snug text-ink transition-colors placeholder:text-faint focus:border-line-strong focus:outline-none focus-visible:outline-none!"
      />
      <button
        type="submit"
        data-testid="chat-send"
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-onpastel bg-yellow text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)] transition-[transform,box-shadow] duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:border-line disabled:bg-elevated disabled:text-faint disabled:shadow-none"
      >
        <ArrowUp className="size-5" strokeWidth={2.5} />
      </button>
    </form>
  );
}
