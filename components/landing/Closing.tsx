"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { Marquee } from "@/components/ui/Marquee";
import { BrandImage, CtaLink, Starburst } from "./bits";
import { Eyebrow, Headline, Reveal } from "./motion";

const REPO = "https://github.com/ebenbaruk/meta-global-hack-2026";
const DEMO_URL = "https://youtu.be/0TMiTiUInkQ";
const DEMO_EMBED = "https://www.youtube-nocookie.com/embed/0TMiTiUInkQ?autoplay=1&rel=0";

/** The demo video slot: a roastery photo card with a play sticker; a tap swaps in the YouTube player. */
function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const photoY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const [playing, setPlaying] = useState(false);
  return (
    <section id="demo" className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-8 lg:pb-32">
      <motion.div ref={ref} style={{ scale }} className="relative">
        {playing ? (
          <div className="relative aspect-video overflow-hidden rounded-card border-[1.5px] border-line-strong bg-onpastel">
            <iframe
              src={DEMO_EMBED}
              title="Feedforward demo video"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the 3-minute demo video"
            className="group relative block aspect-[4/5] w-full overflow-hidden rounded-card border-[1.5px] border-line-strong bg-elevated text-left sm:aspect-[16/8]"
          >
            <motion.div style={{ y: photoY }} className="absolute -inset-y-[10%] inset-x-0">
              <BrandImage name="photo-roastery.webp" alt="Fresh beans in the roaster's cooling tray" className="size-full object-cover" />
            </motion.div>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-8">
              <div className="rounded-[22px] border-[1.5px] border-line-strong bg-surface p-5 sm:p-7">
                <p className="typed font-bold text-lilac-ink">The demo · 3 min</p>
                <p className="mt-2 max-w-[14ch] font-display text-[clamp(30px,5vw,60px)] leading-[0.95] font-black text-ink">
                  Maya&apos;s morning, start to finish.
                </p>
              </div>
              <span className="inline-flex size-20 shrink-0 items-center justify-center rounded-full border-[1.5px] border-onpastel bg-yellow text-onpastel shadow-[3px_3px_0_0_var(--color-onpastel)] transition group-hover:scale-105 sm:size-24">
                <Play className="size-8 translate-x-0.5 fill-current" />
              </span>
            </div>
          </button>
        )}
        {!playing && (
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            whileInView={{ scale: 1, rotate: 10 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.3 }}
            className="pointer-events-none absolute -top-8 right-4 sm:-top-10 sm:right-12"
          >
            <Starburst tone="lilac" className="size-28 sm:size-32">
              Real API, real time
            </Starburst>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

export function Closing() {
  return (
    <>
      <Demo />
      <section className="relative overflow-hidden border-t-[1.5px] border-line-strong bg-lilac text-onpastel">
        <Marquee
          items={["Approve", "Edit", "Dismiss", "Dive in", "Zero prompts typed", "Your morning, handled"]}
          speed={30}
          className="border-b-[1.5px] border-onpastel bg-onpastel py-3 text-yellow"
        />
        <div className="mx-auto max-w-[1360px] px-4 pt-20 pb-16 sm:px-8 lg:pt-28 lg:pb-20">
          <p className="typed flex items-center gap-2 font-bold">
            <span aria-hidden>✺</span> 08 · The point
          </p>
          <Headline
            text={"Chat asks you for labor.\nThe feed gives you leverage."}
            color="text-onpastel"
            className="mt-6 text-[clamp(40px,11.5vw,64px)] lg:text-[clamp(64px,6vw,92px)]"
          />
          <div className="mt-10 flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <Reveal className="flex flex-col gap-6">
              <p className="max-w-[30rem] text-[18px] leading-relaxed text-pretty sm:text-[19px]">
                Flip through Maya&apos;s morning: real cards, prepared live by three Meta models while you watch the Agent
                Lens.
              </p>
              <div className="flex flex-wrap gap-3">
                <CtaLink href="/app">
                  Open Maya&apos;s feed <ArrowRight className="size-[18px]" />
                </CtaLink>
                <a
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-onpastel px-6 text-[16px] font-semibold text-onpastel transition hover:bg-lilac-soft/40"
                >
                  <GithubMark /> Read the code
                </a>
              </div>
            </Reveal>
            <motion.div
              initial={{ y: 60, rotate: -12, opacity: 0 }}
              whileInView={{ y: 0, rotate: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="mx-auto w-52 shrink-0 sm:mx-0 sm:w-60 lg:-mt-24 lg:w-72"
            >
              <BrandImage name="mascot-coffee.webp" alt="Ford, the mascot, with a coffee and a thumbs up" outlined className="h-auto w-full" />
            </motion.div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-[1360px] px-4 pt-14 pb-10 sm:px-8">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            A feed of work your agents already did. Built for the Meta Global AI Developer Hackathon 2026, Indie track.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[15px]">
          <Eyebrow className="col-span-2 mb-1">Links</Eyebrow>
          <a href="/app" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-lilac">
            The app
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-lilac">
            GitHub
          </a>
          <a href="#how" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-lilac">
            How it works
          </a>
          <a href={DEMO_URL} target="_blank" rel="noreferrer" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-lilac">
            Demo video
          </a>
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="typed text-[10px] leading-relaxed text-muted">
          Maya, Ember &amp; Oak and every person, brand and sponsor shown are fictional.
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-[18px]" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
