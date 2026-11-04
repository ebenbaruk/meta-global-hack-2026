"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { MiniCard } from "./bits";
import { Eyebrow, H2, Headline, PopIn, Reveal, SPRING } from "./motion";
import { Sticker } from "@/components/ui/Sticker";

const FAN = [
  { tone: "email", kind: "Email", title: "Reply to Lena at Bloom Café", body: "Pricing for 40 lb a week, drafted in your voice.", action: "Send reply", r: -9, x: -70, y: 30 },
  { tone: "schedule", kind: "Schedule", title: "Thursday 10:00 is double-booked", body: "Found a free slot, travel time included.", action: "Propose slot", r: 7, x: 70, y: 14 },
  { tone: "team", kind: "Team update", title: "Web sales +33.4% yesterday", body: "Numbers for #team, ready to post.", action: "Post update", r: -2, x: 0, y: -8 },
] as const;

function FanCard({ card, i, progress }: { card: (typeof FAN)[number]; i: number; progress: MotionValue<number> }) {
  const rotate = useTransform(progress, [0, 1], [0, card.r]);
  const x = useTransform(progress, [0, 1], [0, card.x]);
  const y = useTransform(progress, [0, 1], [i * -10, card.y]);
  return (
    <motion.div style={{ rotate, x, y, zIndex: i }} className="absolute inset-x-0 top-10 mx-auto w-[min(300px,78vw)]">
      <MiniCard tone={card.tone} kind={card.kind} title={card.title} action={card.action}>
        {card.body}
      </MiniCard>
    </motion.div>
  );
}

/** "Chat is the wrong shape for agents": blank box vs. a deck of finished work that fans out on scroll. */
export function Insight() {
  const fan = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: fan, offset: ["start end", "center center"] });
  const spread = useTransform(scrollYProgress, [0.15, 1], [0, 1]);

  return (
    <section id="insight" className="mx-auto max-w-[1360px] px-4 py-24 sm:px-8 lg:py-32">
      <Eyebrow>01 · The insight</Eyebrow>
      <Headline
        text={"Chat is the\nwrong shape\nfor agents."}
        mark="wrong"
        className={H2}
      />

      <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-2 lg:gap-20">
        {/* Chat: the blank box */}
        <Reveal className="relative">
          <p className="typed font-bold text-muted">Chat asks you</p>
          <div className="mt-4 rounded-card border border-line bg-surface p-5 shadow-card sm:p-7">
            <p className="text-[15px] text-muted">What would you like me to do today?</p>
            <div className="mt-24 flex items-center gap-3 rounded-full border border-line bg-elevated py-2 pr-2 pl-5">
              <span className="flex-1 text-[15px] text-muted">
                Ask anything
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-ink" />
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-elevated text-muted ring-1 ring-line">↑</span>
            </div>
          </div>
          <ul className="mt-6 space-y-2.5 text-[16px] text-muted sm:text-[17px]">
            {["Figure out what it can do.", "Explain the task.", "Paste the context.", "Repeat. Every. Time."].map((t, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING, delay: 0.1 + i * 0.08 }}
                className="flex gap-3"
              >
                <span className="typed pt-1 text-[10px] text-muted">0{i + 1}</span>
                <span className={i === 3 ? "font-semibold text-ink" : undefined}>{t}</span>
              </motion.li>
            ))}
          </ul>
          <PopIn rotate={-8} className="absolute top-5 right-3 sm:right-8">
            <Sticker tone="rose" rotate={-8}>Digital labor</Sticker>
          </PopIn>
        </Reveal>

        {/* Feed: the work is already done */}
        <div>
          <p className="typed font-bold text-muted">The feed tells you</p>
          <div ref={fan} className="relative mt-4 h-[250px] sm:h-[330px]">
            {FAN.map((c, i) => (
              <FanCard key={c.title} card={c} i={i} progress={spread} />
            ))}
          </div>
          <Reveal className="mt-8">
            <p className="max-w-[30rem] text-[17px] leading-relaxed text-pretty text-muted sm:text-[19px]">
              Billions of people already know how to scroll, spot something useful and act on it. So we{" "}
              <span className="font-semibold text-ink">inverted the prompt</span>: the agent brings you the next useful
              action, fully prepared. You just decide.
            </p>
          </Reveal>
        </div>
      </div>

      <Reveal className="mt-20 lg:mt-28">
        <blockquote className="mx-auto max-w-[56rem] text-center text-balance font-display text-[clamp(28px,6vw,52px)] leading-[1.05] font-bold text-ink">
          “Meta invented the feed, and the feed pays for Meta. This is what it becomes when{" "}
          <span className="text-lilac-ink">agents fill it.</span>”
        </blockquote>
      </Reveal>
    </section>
  );
}
