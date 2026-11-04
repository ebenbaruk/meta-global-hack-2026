"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Sticker } from "@/components/ui/Sticker";
import { BrandImage, CtaLink, Starburst } from "./bits";
import { Headline, SPRING } from "./motion";
import { PhoneFrame } from "./PhoneFrame";

export function Hero() {
  const { scrollY } = useScroll();
  const phoneY = useTransform(scrollY, [0, 800], [0, -90]);
  const phoneRotate = useTransform(scrollY, [0, 800], [-3, 2]);
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
          className="pointer-events-none absolute -top-3 right-0 w-20 sm:top-0 sm:w-32 lg:-top-20 lg:right-10 lg:w-40"
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
          className="typed mb-5 flex flex-wrap items-center gap-2 pr-20 font-bold text-muted sm:pr-0"
        >
          <span className="rounded-full border-[1.5px] border-line-strong px-2.5 py-1 text-ink">Indie track</span>
          Meta Global AI Developer Hackathon · 2026
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
          className="mt-7 max-w-[34rem] text-[18px] leading-relaxed text-muted sm:text-[20px]"
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

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="typed mt-8 text-faint"
        >
          Built on Muse Spark 1.3 · Muse Image 1.0 · SAM 3.1
        </motion.p>
      </div>

      <div className="relative mx-auto [--s:0.76] sm:[--s:0.82] lg:[--s:0.74] xl:[--s:0.76]">
        <motion.div
          initial={{ opacity: 0, y: 120, rotate: 10 }}
          animate={{ opacity: 1, y: 0, rotate: -3 }}
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

        <div className="absolute -right-2 bottom-24 sm:-right-10">
          <Sticker tone="mint" rotate={6} className="text-[11px] shadow-[2px_2px_0_0_var(--color-onpastel)]">
            Drafted for you ✓
          </Sticker>
        </div>
      </div>
    </section>
  );
}
