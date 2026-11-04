"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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

/** The drafted reply as a letter: typed envelope lines, then the body in Geist. */
export function EmailBody({ card }: { card: EmailCard }) {
  const { to, subject, body } = card.payload;
  const { name, email } = parseRecipient(to);
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const collapsible = body.length > LONG_BODY || body.split("\n").length > 7;

  return (
    <div className="relative mt-2 min-w-0 rounded-[20px] border border-line bg-bg">
      {/* Postmark */}
      <span
        aria-hidden
        className="typed absolute -top-3 right-3 rotate-3 rounded-md border-[1.5px] border-onpastel bg-sky px-2 py-1 text-[9.5px] leading-none font-bold text-onpastel"
      >
        Drafted in your voice
      </span>

      <dl className="font-mono text-[11.5px] leading-tight">
        <div className="flex min-w-0 items-baseline gap-3 border-b border-dashed border-line px-4 pt-4 pb-2.5">
          <dt className="w-8 shrink-0 font-bold tracking-wider text-faint uppercase">To</dt>
          <dd className="min-w-0 truncate text-ink">
            {name} <span className="text-faint">&lt;{email}&gt;</span>
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline gap-3 border-b border-dashed border-line px-4 py-2.5">
          <dt className="w-8 shrink-0 font-bold tracking-wider text-faint uppercase">Re</dt>
          <dd className="min-w-0 break-words text-ink">{subject.replace(/^re:\s*/i, "")}</dd>
        </div>
      </dl>

      <div className="px-4 pt-3 pb-3.5">
        <motion.div
          initial={false}
          animate={{ height: expanded || !collapsible ? "auto" : "11em" }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
          className="relative overflow-hidden text-[14.5px] leading-[1.55]"
        >
          <p className="whitespace-pre-line break-words text-ink">{body}</p>
          <AnimatePresence>
            {collapsible && !expanded && (
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent"
              />
            )}
          </AnimatePresence>
        </motion.div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="typed mt-2 -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[10.5px] text-lilac-ink transition-colors hover:bg-lilac-soft"
          >
            {expanded ? "Fold the letter" : "Read the whole letter"}
            <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
