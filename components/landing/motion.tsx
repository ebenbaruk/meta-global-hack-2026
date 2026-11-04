"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The one spring of the landing page (same as cards materializing in the app). */
export const SPRING = { type: "spring", stiffness: 260, damping: 24 } as const;
export const POP = { type: "spring", stiffness: 500, damping: 16 } as const;

/** Fades and rises into place the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ ...SPRING, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A display headline whose words rise one after another. Lines are separated by "\n". */
export function Headline({
  text,
  as: Tag = "h2",
  className,
  mark,
  delay = 0,
  onLoad = false,
  color = "text-ink",
}: {
  /** Text color class (cn does not merge conflicting classes). */
  color?: string;
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  /** A word (exact match) that gets the lilac marker highlight. */
  mark?: string;
  delay?: number;
  /** Animate on mount instead of on scroll (the hero). */
  onLoad?: boolean;
}) {
  const lines = text.split("\n");
  let i = 0;
  const trigger = onLoad
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, amount: 0.4 } };
  return (
    <Tag className={cn("font-display font-black leading-[0.92]", color, className)}>
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
      <motion.span className="block" initial="hide" {...trigger} aria-hidden>
        {lines.map((line, l) => (
          <span key={l} className="block">
            {line.split(" ").map((word, w) => {
              const n = i++;
              const marked = mark && word === mark;
              return (
                <Fragment key={w}>
                <span className={cn("inline-block overflow-hidden pb-[0.08em] align-bottom", marked && "-mx-[0.1em] px-[0.1em]")}>
                  <motion.span
                    className={cn("relative inline-block", marked && "z-0 text-onpastel")}
                    variants={{ hide: { y: "105%", rotate: 4 }, show: { y: "0%", rotate: 0 } }}
                    transition={{ ...SPRING, delay: delay + n * 0.06 }}
                  >
                    {marked && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-x-[-0.07em] top-[0.06em] bottom-[-0.02em] -z-10 origin-left -rotate-1 rounded-[0.16em] bg-lilac"
                        variants={{ hide: { scaleX: 0 }, show: { scaleX: 1 } }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay + n * 0.06 + 0.35 }}
                      />
                    )}
                    {word}
                  </motion.span>
                </span>
                {w < line.split(" ").length - 1 && " "}
                </Fragment>
              );
            })}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Small typed section label: "✺ 02 · THE INSIGHT". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("typed flex items-center gap-2 font-bold text-muted", className)}>
      <span aria-hidden className="text-lilac-ink">✺</span>
      {children}
    </p>
  );
}

/** A sticker that pops in when scrolled into view (the ui Sticker pops on mount). */
export function PopIn({
  children,
  rotate = -6,
  delay = 0.2,
  className,
}: {
  children: ReactNode;
  rotate?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: rotate - 14 }}
      whileInView={{ scale: 1, rotate }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ ...POP, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
