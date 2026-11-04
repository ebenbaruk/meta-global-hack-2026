"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Heart, ImageOff, MessageCircle, Send, Sparkles } from "lucide-react";
import type { Card } from "@/lib/schemas";

type SocialPostCard = Extract<Card, { kind: "social_post" }>;

const HANDLE = "emberandoak";

function ImageSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-elevated">
      <div
        className="absolute -inset-1/2 animate-[spin_9s_linear_infinite] blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgb(61 123 255 / 0.55), rgb(139 92 246 / 0.5), rgb(245 200 106 / 0.3), rgb(255 93 108 / 0.3), rgb(61 123 255 / 0.55))",
        }}
      />
      <div className="skeleton absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center p-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-black/40 px-3 py-1.5 text-xs font-medium text-fg backdrop-blur-md">
          <Sparkles className="size-3.5 animate-pulse text-accent-strong" aria-hidden />
          Muse Image is rendering…
        </span>
      </div>
    </div>
  );
}

function ImageFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-elevated to-surface">
      <div className="flex max-w-[16rem] flex-col items-center gap-2 px-6 text-center">
        <span className="grid size-10 place-items-center rounded-full border border-line bg-white/[0.04]">
          <ImageOff className="size-4.5 text-faint" aria-hidden />
        </span>
        <p className="text-sm font-medium text-fg">Image didn&apos;t come through</p>
        <p className="text-xs leading-snug text-faint">The caption is ready and can go out on its own.</p>
      </div>
    </div>
  );
}

/** Splits the caption so inline #tags render in the accent color. */
function Caption({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="text-accent-strong">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function SocialPostBody({ card }: { card: SocialPostCard }) {
  const { caption, hashtags, platform } = card.payload;
  const reduce = useReducedMotion();
  const status = card.imageStatus ?? (card.image ? "ready" : "loading");
  const tags = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).filter((t) => !caption.includes(t));

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-black">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full bg-gradient-to-tr from-sponsor via-danger to-violet p-[1.5px]">
          <span className="grid size-7 place-items-center rounded-full border-2 border-black bg-elevated text-[10px] font-bold text-fg">
            E&amp;O
          </span>
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-semibold text-fg">{HANDLE}</div>
          <div className="truncate text-[11px] text-faint">Portland, Oregon</div>
        </div>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted capitalize">
          {platform}
        </span>
      </div>

      <div className="relative aspect-square w-full overflow-hidden bg-elevated">
        <AnimatePresence initial={false}>
          {status === "ready" && card.image ? (
            <motion.img
              key="img"
              src={card.image}
              alt={card.payload.imagePrompt}
              className="absolute inset-0 size-full object-cover"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: reduce ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : status === "error" ? (
            <motion.div key="err" className="absolute inset-0" exit={{ opacity: 0 }}>
              <ImageFallback />
            </motion.div>
          ) : (
            <motion.div key="loading" className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
              <ImageSkeleton />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4 px-3 pt-2.5 text-fg" aria-hidden>
        <Heart className="size-5" />
        <MessageCircle className="size-5" />
        <Send className="size-5" />
        <Bookmark className="ml-auto size-5" />
      </div>

      <p className="px-3 pt-2 pb-3 text-[14px] leading-[1.45] break-words whitespace-pre-line text-fg/90">
        <span className="mr-1.5 font-semibold text-fg">{HANDLE}</span>
        <Caption text={caption} />
        {tags.length > 0 && <span className="mt-1 block text-accent-strong">{tags.join(" ")}</span>}
      </p>
    </div>
  );
}
