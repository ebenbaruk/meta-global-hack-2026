"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { BrandImage, CtaLink, Starburst } from "./bits";
import { Headline, SPRING } from "./motion";
import { PhoneFrame } from "./PhoneFrame";

/** What the agents finished overnight, popping out of the phone one after another. */
const DONE = [
  { text: "Reply to Lena drafted", tone: "bg-sky" },
  { text: "Thursday clash fixed", tone: "bg-tangerine" },
  { text: "Sales update written", tone: "bg-mint" },
  { text: "Launch visual rendered", tone: "bg-rose" },
  { text: "Invoice logged", tone: "bg-yellow" },
] as const;

function DoneTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DONE.length), 2400);
    return () => clearInterval(t);
  }, []);
  const item = DONE[i];
  return (
    <div className="relative h-8" aria-hidden>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={item.text}
          initial={{ scale: 0.4, rotate: -14, y: 18, opacity: 0 }}
          animate={{ scale: 1, rotate: 5, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, rotate: 10, y: -22, opacity: 0, transition: { duration: 0.25 } }}
          transition={{ type: "spring", stiffness: 460, damping: 18 }}
          className={cn(
            "typed absolute bottom-0 left-0 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-onpastel px-3 py-1.5 text-[11px] leading-none font-bold whitespace-nowrap text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)]",
            item.tone,
          )}
        >
          {item.text} ✓
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

const MODEL_CHIPS = [
  ["Muse Spark 1.3", "bg-lilac"],
  ["Muse Image 1.0", "bg-rose"],
  ["SAM 3.1", "bg-mint"],
] as const;

export function Hero() {
  const { scrollY } = useScroll();
  const phoneY = useTransform(scrollY, [0, 800], [0, -90]);
  const phoneRotate = useTransform(scrollY, [0, 800], [0, 4]);
  const burstRotate = useTransform(scrollY, [0, 800], [12, 120]);
  const mascotY = useTransform(scrollY, [0, 800], [0, 60]);

  return (
    <section className="relative mx-auto grid max-w-[1360px] gap-12 px-4 pt-8 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:pt-2 lg:pb-16">
      <div className="relative">
        <motion.div
          style={{ y: mascotY }}
          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ ...SPRING, delay: 0.5 }}
          className="pointer-events-none absolute -top-9 right-0 w-[72px] sm:-top-8 sm:w-24 lg:-top-20 lg:right-10 lg:w-40"
        >
          <BrandImage
            name="mascot-wave.webp"
            alt="Ford, the Feedforward mascot, waving"
            eager outlined
            className="h-auto w-full"
            fallback={<span className="text-5xl">✺</span>}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.05 }}
          className="typed mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 font-bold text-muted sm:pr-28 lg:pr-0"
        >
          <span className="rounded-full border-[1.5px] border-line-strong px-2.5 py-1 whitespace-nowrap text-ink">Indie track · 2026</span>
          <span>Meta Global AI Developer Hackathon</span>
        </motion.p>

        <Headline
          as="h1"
          onLoad
          delay={0.1}
          mark="scrolling."
          text={"Stop prompting.\nStart scrolling."}
          className="max-w-[11ch] text-[clamp(58px,15.5vw,92px)] lg:max-w-none lg:text-[clamp(80px,6.9vw,112px)]"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.55 }}
          className="mt-7 max-w-[34rem] text-[18px] leading-relaxed text-pretty text-muted sm:text-[20px]"
        >
          Your agents work overnight. You wake up to a <span className="font-semibold text-ink">feed of finished work</span>:
          approve, edit, dismiss, or dive in. No blank box. No prompt engineering. Just your thumb.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.7 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <CtaLink href="/app">
            Open Maya&apos;s feed <ArrowRight className="size-[18px]" />
          </CtaLink>
          <CtaLink href="#demo" variant="secondary">
            <Play className="size-4 fill-current" /> Watch the 3-min demo
          </CtaLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-9 flex flex-wrap items-center gap-2"
        >
          <span className="typed mr-1 text-muted">Built on</span>
          {MODEL_CHIPS.map(([name, tone], i) => (
            <motion.span
              key={name}
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 16, delay: 1 + i * 0.1 }}
              className="typed inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line-strong bg-surface px-2.5 py-1 font-bold whitespace-nowrap text-ink"
            >
              <span aria-hidden className={cn("size-2.5 rounded-full border border-onpastel", tone)} />
              {name}
            </motion.span>
          ))}
        </motion.div>
      </div>

      <div className="relative mx-auto [--s:0.76] sm:[--s:0.82] lg:[--s:0.72] xl:[--s:0.76] 2xl:[--s:0.86]">
        <motion.div
          initial={{ opacity: 0, y: 120, rotate: 10 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ type: "spring", stiffness: 90, damping: 16, delay: 0.25 }}
        >
          <motion.div style={{ y: phoneY, rotate: phoneRotate }}>
            <PhoneFrame />
          </motion.div>
        </motion.div>

        <motion.div
          style={{ rotate: burstRotate }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 14, delay: 1.1 }}
          className="absolute top-[34%] -left-10 sm:-left-16 lg:-left-24"
        >
          <Starburst className="size-24 sm:size-28">Live app · tap it</Starburst>
        </motion.div>

        <div className="absolute bottom-28 -left-2 sm:-left-14 lg:-left-20">
          <DoneTicker />
        </div>
      </div>
    </section>
  );
}
