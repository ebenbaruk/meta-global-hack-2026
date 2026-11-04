"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Heart, ImageOff, MessageCircle, Send } from "lucide-react";
import type { Card } from "@/lib/schemas";

type SocialPostCard = Extract<Card, { kind: "social_post" }>;

const HANDLE = "emberandoak";

function ImageSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-elevated">
      <div className="skeleton absolute inset-0" />
      <div className="scanline" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
        <span className="typed inline-flex items-center gap-2 rounded-full border-[1.5px] border-onpastel bg-yellow px-3 py-1.5 text-[10px] leading-none font-bold text-onpastel">
          <span className="size-1.5 animate-pulse rounded-full bg-onpastel" aria-hidden />
          Muse Image is developing…
        </span>
      </div>
    </div>
  );
}

function ImageFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-elevated">
      <div className="flex max-w-[16rem] flex-col items-center gap-2 px-6 text-center">
        <span className="grid size-11 place-items-center rounded-full border-[1.5px] border-line-strong bg-surface">
          <ImageOff className="size-5 text-ink" aria-hidden />
        </span>
        <p className="font-display text-[18px] font-bold text-ink">The photo didn&apos;t develop</p>
        <p className="text-[13px] leading-snug text-muted">The caption is ready and can go out on its own.</p>
      </div>
    </div>
  );
}

/** Splits the caption so inline #tags render as links. */
function Caption({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="text-lilac-ink">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** The post exactly as it will appear: account row, square photo, action icons, caption. */
export function SocialPostBody({ card }: { card: SocialPostCard }) {
  const { caption, hashtags, platform } = card.payload;
  const reduce = useReducedMotion();
  const status = card.imageStatus ?? (card.image ? "ready" : "loading");
  const tags = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).filter((t) => !caption.includes(t));

  return (
    <div className="min-w-0 overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full bg-[conic-gradient(var(--color-yellow),var(--color-tangerine),var(--color-rose),var(--color-lilac),var(--color-yellow))] p-[2px]">
          <span className="font-display grid size-8 place-items-center rounded-full border-2 border-surface bg-ink text-[10px] font-black text-surface">
            E&amp;O
          </span>
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13.5px] font-semibold text-ink">{HANDLE}</div>
          <div className="truncate text-[11.5px] text-faint">Portland, Oregon</div>
        </div>
        <span className="typed rounded-full border-[1.5px] border-onpastel bg-rose px-2 py-1 text-[9.5px] leading-none font-bold text-onpastel">
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

      <div className="flex items-center gap-4 px-3 pt-3 text-ink" aria-hidden>
        <Heart className="size-[22px]" />
        <MessageCircle className="size-[22px]" />
        <Send className="size-[22px]" />
        <Bookmark className="ml-auto size-[22px]" />
      </div>

      <p className="px-3 pt-2 pb-3.5 text-[14px] leading-[1.5] break-words whitespace-pre-line text-ink">
        <span className="mr-1.5 font-semibold">{HANDLE}</span>
        <Caption text={caption} />
        {tags.length > 0 && <span className="mt-1.5 block text-lilac-ink">{tags.join(" ")}</span>}
      </p>
    </div>
  );
}
