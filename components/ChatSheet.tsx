"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowUp, Check, RotateCcw, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KIND_META } from "@/components/cards/kindMeta";
import { cn } from "@/lib/cn";
import type { Card } from "@/lib/schemas";

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
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && card && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.button
            type="button"
            aria-label="Close chat"
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
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
            className={cn(
              "glass-border relative flex w-full flex-col overflow-hidden bg-surface shadow-card",
              "h-[calc(100dvh-max(env(safe-area-inset-top),12px)-8px)] rounded-t-[28px]",
              "md:h-[min(780px,88dvh)] md:max-w-[560px] md:rounded-[28px]",
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : SPRING}
            drag="y"
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
  const streaming = busy && last?.type === "text" && last.role === "user";

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
    try {
      const res = await fetch("/api/chat", {
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
    } catch {
      if (controller.signal.aborted) return;
      setEntries((list) => [
        ...list.filter((e) => e.id !== replyId),
        { id: replyId, type: "text", role: "assistant", content: "I couldn't reach the model just now. Try again?" },
      ]);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
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
      if (!res.ok) throw new Error("revise failed");
      const { payload } = (await res.json()) as { payload: Payload };
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
        className="shrink-0 touch-none border-b border-line px-5 pt-2.5 pb-4 select-none"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden />
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-elevated", meta.tint)}>
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-wider text-faint uppercase">Dive in · {meta.label}</p>
            <h2 className="mt-0.5 truncate text-[15px] font-semibold text-fg">{card.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-elevated text-muted transition-colors hover:bg-white/10 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
        {knows && (
          <div className="mt-3 flex min-w-0 items-center gap-2 rounded-full border border-line bg-accent-soft/50 py-1.5 pr-3 pl-2 text-xs">
            <Sparkles className="size-3.5 shrink-0 text-accent-strong" aria-hidden />
            <span className="shrink-0 font-medium text-accent-strong">Knows</span>
            <span className="truncate text-muted">{knows}</span>
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
                <Bubble key={entry.id} role={entry.role} content={entry.content} />
              ) : (
                <RevisionBlock key={entry.id} card={card} entry={entry} onApply={() => apply(entry)} onRetry={() => revise(entry.instruction)} />
              ),
            )}
            {streaming && <Typing key="typing" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Starters + composer */}
      <footer className="shrink-0 border-t border-line bg-surface/95 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              data-testid="chat-chip"
              disabled={busy}
              onClick={() => ("revise" in s ? revise(s.revise) : ask(s.prompt))}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-elevated px-3.5 py-2 text-[13px] font-medium text-fg transition-colors hover:border-accent/50 hover:bg-accent-soft disabled:opacity-40"
            >
              {"revise" in s && <Wand2 className="size-3.5 text-accent-strong" aria-hidden />}
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
      <div className="max-w-[85%] space-y-3 rounded-2xl rounded-tl-md border border-line bg-elevated px-4 py-3 text-[14px] leading-relaxed text-muted">
        <p>
          <span className="text-fg">{card.why}</span> Ask me anything about it, or have me rework the draft.
        </p>
        {draft && (
          <blockquote className="border-l-2 border-accent/60 pl-3 text-[13px] leading-relaxed whitespace-pre-line text-muted">
            <span className="line-clamp-4">{draft}</span>
          </blockquote>
        )}
      </div>
    </div>
  );
}

function AgentAvatar() {
  return (
    <span
      aria-hidden
      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-violet shadow-glow"
    >
      <Sparkles className="size-3.5 text-white" />
    </span>
  );
}

const enter = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0 },
  transition: SPRING,
};

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const user = role === "user";
  return (
    <motion.div {...enter} data-testid="chat-message" data-role={role} className={cn("flex items-start gap-2.5", user && "justify-end")}>
      {!user && <AgentAvatar />}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap",
          user ? "rounded-tr-md bg-accent text-white" : "rounded-tl-md border border-line bg-elevated text-fg",
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div {...enter} className="flex items-start gap-2.5" aria-label="Agent is typing">
      <AgentAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-elevated px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-muted"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
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
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl rounded-tl-md border border-line-strong bg-elevated">
        {entry.status === "loading" && (
          <div className="space-y-2.5 px-4 py-3.5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
              <Wand2 className="size-3.5 animate-pulse text-accent-strong" aria-hidden />
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
            <button type="button" onClick={onRetry} className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {entry.status === "ready" && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-success">
                <Check className="size-3.5" aria-hidden /> Updated the draft
              </p>
              <span className="font-mono text-[11px] text-faint">
                {beforeWords} → {afterWords} words
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="mb-2 line-clamp-2 text-[12px] leading-relaxed text-faint line-through decoration-faint/60">
                {entry.before}
              </p>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-fg">{after}</p>
            </div>
            <div className="px-3 pb-3">
              <button
                type="button"
                data-testid="chat-apply"
                disabled={entry.applied}
                onClick={onApply}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors",
                  entry.applied ? "bg-success/15 text-success" : "bg-accent text-white hover:bg-accent-strong",
                )}
              >
                {entry.applied ? (
                  <>
                    <Check className="size-4" /> Applied to card
                  </>
                ) : (
                  "Apply to card"
                )}
              </button>
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
        className="no-scrollbar min-h-11 flex-1 resize-none focus-visible:outline-none! rounded-[22px] border border-line-strong bg-elevated px-4 py-[10px] text-base leading-snug text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none"
      />
      <button
        type="submit"
        data-testid="chat-send"
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-all hover:bg-accent-strong disabled:bg-elevated disabled:text-faint"
      >
        <ArrowUp className="size-5" />
      </button>
    </form>
  );
}
