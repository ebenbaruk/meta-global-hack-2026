"use client";

import { motion } from "framer-motion";
import { Sticker } from "@/components/ui/Sticker";
import { cn } from "@/lib/cn";
import { BrandImage, KIND_TONE, type KindTone } from "./bits";
import { Eyebrow, H2, Headline, PopIn, Reveal, SPRING } from "./motion";

/** Facts straight from data/persona (inbox, calendar, sales, notes). */
const MORNING: { tone: KindTone; kind: string; seen: string; done: string }[] = [
  {
    tone: "email",
    kind: "Email",
    seen: "Lena at Bloom Café wants wholesale pricing for 40 lb a week.",
    done: "Reply drafted in Maya's voice: pricing, delivery days, terms.",
  },
  {
    tone: "schedule",
    kind: "Schedule",
    seen: "Thursday: the Bloom tasting overlaps the 10:00 investor coffee.",
    done: "A free slot found and checked in code, 30 min travel buffer.",
  },
  {
    tone: "team",
    kind: "Team",
    seen: "Web sales +33.4% yesterday vs the 7-day average.",
    done: "Update for the team, with numbers computed from the sales sheet.",
  },
  {
    tone: "social",
    kind: "Social",
    seen: "Ethiopia Guji Natural launches Friday.",
    done: "Instagram post written, visual rendered by Muse Image.",
  },
  {
    tone: "snap",
    kind: "Snap",
    seen: "Invoice HGI-20931 on the counter: $3,357.",
    done: "Snapped, read and logged, with a task to pay by Nov 19.",
  },
];

function Photo({ name, alt, className, label }: { name: string; alt: string; className?: string; label: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[24px] border-[1.5px] border-line-strong bg-elevated", className)}>
      <BrandImage
        name={name}
        alt={alt}
        className="size-full object-cover"
        fallback={<span className="typed px-4 text-center font-bold">{label}</span>}
      />
    </div>
  );
}

export function Maya() {
  return (
    <section id="maya" className="relative overflow-x-clip bg-elevated/60 py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1360px] gap-14 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="relative">
          <Reveal>
            <motion.div whileHover={{ rotate: -1, scale: 1.01 }} transition={SPRING}>
              <Photo
                name="photo-maya.webp"
                alt="Maya Chen, founder of Ember & Oak Coffee Roasters, in her roastery"
                label="Maya in her roastery"
                className="aspect-[4/5] w-full -rotate-2 shadow-pop"
              />
            </motion.div>
          </Reveal>
          <Reveal delay={0.15} className="absolute -right-2 -bottom-10 w-[46%] sm:-right-6">
            <Photo
              name="photo-bags.webp"
              alt="Ember & Oak coffee bags on a shelf"
              label="Ember & Oak bags"
              className="aspect-square w-full rotate-3 shadow-pop"
            />
          </Reveal>
          <PopIn rotate={-7} className="absolute -top-5 left-4">
            <Sticker tone="yellow" rotate={-7} className="text-[11px]">
              Fictional founder ✺ Portland, OR
            </Sticker>
          </PopIn>
        </div>

        <div className="pt-10 lg:pt-4">
          <Eyebrow>02 · The persona</Eyebrow>
          <Headline text="Meet Maya." mark="Maya." className={H2} />
          <Reveal>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed text-muted sm:text-[19px]">
              Maya Chen runs <span className="font-semibold text-ink">Ember &amp; Oak Coffee Roasters</span>: a roaster, a café
              bar, three teammates and an inbox that never sleeps. Friday she launches a new coffee. This is her 8:30 am.
            </p>
          </Reveal>

          <ol className="mt-10 space-y-3">
            {MORNING.map((m, i) => (
              <motion.li
                key={m.kind}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ ...SPRING, delay: i * 0.06 }}
                className="grid grid-cols-[auto_1fr] gap-4 rounded-[22px] border border-line bg-surface p-4 shadow-card sm:p-5"
              >
                <span
                  className={cn(
                    "typed mt-0.5 h-fit w-[92px] rounded-full border-[1.5px] border-onpastel px-2.5 py-1 text-center text-[10px] font-bold text-onpastel",
                    KIND_TONE[m.tone],
                  )}
                >
                  {m.kind}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-ink sm:text-[16px]">{m.seen}</p>
                  <p className="mt-1 flex gap-2 text-[14px] text-muted sm:text-[15px]">
                    <span aria-hidden className="text-lilac-ink">→</span>
                    {m.done}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
          <Reveal>
            <p className="typed mt-6 text-muted">Sandboxed data. Every card written live by the agents.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
