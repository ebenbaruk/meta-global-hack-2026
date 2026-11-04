"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, PenLine } from "lucide-react";
import { useState } from "react";
import type { Card } from "@/lib/schemas";

type EmailCard = Extract<Card, { kind: "email_reply" }>;

/** "Lena Ortiz <lena@bloomcafe.com>" → { name, email }. Falls back gracefully on a bare address. */
function parseRecipient(to: string) {
  const match = to.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match && match[1]) return { name: match[1].trim(), email: match[2].trim() };
  const email = (match?.[2] ?? to).trim();
  const local = email.split("@")[0] ?? email;
  const name = local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, email };
}

const LONG_BODY = 320;

export function EmailBody({ card }: { card: EmailCard }) {
  const { to, subject, body } = card.payload;
  const { name, email } = parseRecipient(to);
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const collapsible = body.length > LONG_BODY || body.split("\n").length > 7;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-elevated/60">
      <div className="flex min-w-0 items-center gap-3 border-b border-line px-4 py-3">
        <span className="text-xs font-medium text-muted">To</span>
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-white/[0.05] py-1 pr-3 pl-1">
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-violet text-[11px] font-semibold text-white"
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm text-fg">{name}</span>
          <span className="hidden truncate text-xs text-faint sm:inline">{email}</span>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        <h3 className="text-[15px] leading-snug font-semibold break-words text-fg">{subject}</h3>

        <motion.div
          initial={false}
          animate={{ height: expanded || !collapsible ? "auto" : "10.5em" }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
          className="relative mt-2 overflow-hidden text-[14px] leading-[1.5]"
        >
          <p className="whitespace-pre-line break-words text-muted">{body}</p>
          <AnimatePresence>
            {collapsible && !expanded && (
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13161d] to-transparent"
              />
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <PenLine className="size-3.5" aria-hidden />
            Drafted in your voice
          </span>
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-accent-strong transition-colors hover:bg-accent-soft"
            >
              {expanded ? "Show less" : "Show full draft"}
              <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
