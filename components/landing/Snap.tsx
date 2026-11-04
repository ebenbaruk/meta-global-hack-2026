"use client";

import { motion } from "framer-motion";
import { Camera, ScanLine, Shapes, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { MiniCard } from "./bits";
import { Eyebrow, H2, Headline, PopIn, Reveal, SPRING } from "./motion";

export interface Outline {
  label: string;
  d: string;
  box: { x1: number; y1: number; x2: number; y2: number };
}

/** The demo photo is 1280×1280 (lib/snapMocks.ts). */
const SIZE = 1280;
const TONES = ["var(--color-yellow)", "var(--color-mint)", "var(--color-rose)"];

const STEPS = [
  { icon: Camera, name: "Snap", line: "Point the camera at the invoice on the counter." },
  { icon: ScanLine, name: "Read", line: "Muse Spark vision reads every line and matches it to the supplier's email." },
  { icon: Shapes, name: "Outline", line: "SAM 3.1 outlines what it found, one short phrase per request." },
  { icon: Sparkles, name: "Follow up", line: "Preparers turn it into cards you can approve." },
] as const;

/** Lines read by Muse Spark vision on the demo photo (recorded live). */
const LINES = [
  ["Ethiopia Guji Natural · 240 kg", "$2,136.00"],
  ["Colombia Huila Washed · 140 kg", "$1,036.00"],
  ["Freight & handling", "$185.00"],
] as const;

export function Snap({ outlines }: { outlines: Outline[] }) {
  return (
    <section id="snap" className="relative bg-elevated/60 py-24 lg:py-32">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <Eyebrow>06 · Snap</Eyebrow>
        <Headline
          text={"A photo in.\nPaperwork out."}
          mark="photo"
          className={H2}
        />

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal className="relative lg:sticky lg:top-8 lg:self-start">
            <div className="relative overflow-hidden rounded-card border-[1.5px] border-line-strong bg-surface shadow-pop">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/demo/invoice.webp" alt="A supplier invoice on a wood table next to a sack of green coffee and a scoop" loading="lazy" className="block aspect-square w-full object-cover" />
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full" aria-hidden>
                {outlines.map((o, i) => (
                  <motion.path
                    key={o.label}
                    d={o.d}
                    fill={TONES[i % TONES.length]}
                    fillOpacity={0.22}
                    stroke={TONES[i % TONES.length]}
                    strokeWidth={7}
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, fillOpacity: 0 }}
                    whileInView={{ pathLength: 1, fillOpacity: 0.22 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ pathLength: { duration: 1.6, delay: 0.3 + i * 0.4, ease: "easeInOut" }, fillOpacity: { delay: 1.4 + i * 0.4 } }}
                  />
                ))}
              </svg>
              {outlines.map((o, i) => (
                <motion.span
                  key={o.label}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 500, damping: 16, delay: 1.2 + i * 0.4 }}
                  className="typed absolute rounded-full border-[1.5px] border-onpastel px-2 py-1 text-[9px] whitespace-nowrap font-bold text-onpastel sm:text-[10px]"
                  style={{
                    left: `${(o.box.x1 / SIZE) * 100 + 2}%`,
                    top: `${(o.box.y1 / SIZE) * 100 + 2}%`,
                    background: TONES[i % TONES.length],
                  }}
                >
                  {o.label}
                </motion.span>
              ))}
            </div>
            <p className="typed mt-3 text-[10px] text-muted">Real SAM 3.1 masks on this photo, recorded from the live API.</p>
            <PopIn rotate={8} className="absolute -top-6 -right-2 sm:-right-6">
              <span className="typed inline-block rounded-full border-[1.5px] border-onpastel bg-yellow px-3 py-1.5 text-[11px] font-bold text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)]">
                1 photo → 3 cards
              </span>
            </PopIn>
          </Reveal>

          <div>
            <ol className="space-y-6">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ ...SPRING, delay: i * 0.06 }}
                  className="grid grid-cols-[auto_1fr] gap-4"
                >
                    <span className="grid size-11 place-items-center rounded-full border-[1.5px] border-onpastel bg-mint text-onpastel">
                      <s.icon className="size-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h3 className="font-display text-[26px] leading-none font-bold text-ink">
                        <span className="typed mr-2 align-middle text-[10px] text-muted">0{i + 1}</span>
                        {s.name}
                      </h3>
                      <p className="mt-1.5 text-[16px] leading-snug text-muted">{s.line}</p>
                    </div>
                </motion.li>
              ))}
            </ol>

            <Reveal className="mt-10 rounded-[22px] border border-line bg-surface p-5 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="typed font-bold whitespace-nowrap text-ink">Invoice HGI-20931</p>
                <p className="typed text-[10px] whitespace-nowrap text-muted">Highland Green · due Nov 19</p>
              </div>
              <ul className="mt-4 space-y-2 text-[14px]">
                {LINES.map(([label, amount], i) => (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...SPRING, delay: 0.2 + i * 0.12 }}
                    className="flex justify-between gap-4 border-b border-dashed border-line pb-2 text-muted"
                  >
                    <span>{label}</span>
                    <span className="font-mono text-ink tabular-nums">{amount}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between font-display text-[22px] font-bold text-ink">
                <span>Total</span>
                <span>$3,357.00</span>
              </p>
            </Reveal>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { tone: "task", kind: "Task", title: "Pay Highland invoice by Nov 19", body: "$3,357 by ACH, skipping the 3% card fee.", action: "Add task" },
                { tone: "email", kind: "Email", title: "Confirm Huila allocation by Nov 6", body: "Only 24 bags left. Ship 2 bags Nov 12.", action: "Send" },
              ].map((c, i) => (
                <Reveal key={c.title} delay={0.1 + i * 0.1} className={cn(i === 0 ? "sm:-rotate-1" : "sm:rotate-1")}>
                  <MiniCard tone={c.tone as "task" | "email"} kind={c.kind} title={c.title} action={c.action}>
                    {c.body}
                  </MiniCard>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
