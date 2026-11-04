"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Eyebrow, H2, Headline, Reveal, SPRING } from "./motion";

const MODELS = [
  {
    name: "Muse Spark",
    version: "1.3",
    tone: "bg-lilac",
    flavor: "Reasoning × strict JSON",
    role: "The brain. Mines the context, prepares every card, picks the sponsor that fits her week, reads photos, answers in Dive in.",
    spec: "/chat/completions · json_schema strict · vision · effort low",
  },
  {
    name: "Muse Image",
    version: "1.0",
    tone: "bg-rose",
    flavor: "Launch visuals × real type",
    role: "The art department. Renders the visual for Friday's launch post while you read the caption.",
    spec: "/images/generations · webp · 7–15 s",
  },
  {
    name: "SAM",
    version: "3.1",
    tone: "bg-mint",
    flavor: "Pixels × outlines",
    role: "The eye. Outlines the invoice, the sack, the scoop in a photo you just snapped.",
    spec: "/responses · one-bit masks · 1–3 s a phrase",
  },
] as const;

/** A drink-can silhouette in the model's color, with its name running down the side. */
function Can({ name, version, tone }: { name: string; version: string; tone: string }) {
  return (
    <div className="relative mx-auto h-[214px] w-[94px] sm:h-[280px] sm:w-[148px]">
      {/* rim */}
      <div className={cn("absolute inset-x-2 top-0 h-4 rounded-[50%] sm:inset-x-3 sm:h-5 border-[1.5px] border-onpastel brightness-90", tone)} />
      <div
        className={cn(
          "absolute inset-x-0 top-2 bottom-0 overflow-hidden rounded-[26px] rounded-t-[20px] border-[1.5px] border-onpastel sm:top-2.5 sm:rounded-[38px] sm:rounded-t-[30px]",
          tone,
        )}
      >
        <div className="absolute inset-y-0 left-2 w-2 rounded-full bg-yellow/40 sm:left-3 sm:w-3" />
        <div className="absolute inset-0">
          <span className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 font-display text-[20px] leading-none sm:text-[32px] font-black whitespace-nowrap text-onpastel">
            {name}
          </span>
        </div>
        <span className="typed absolute bottom-3 left-1/2 sm:bottom-5 -translate-x-1/2 rounded-full border-[1.5px] border-onpastel bg-yellow px-2 py-0.5 text-[10px] font-bold text-onpastel">
          v{version}
        </span>
      </div>
    </div>
  );
}

export function Models() {
  return (
    <section id="models" className="border-y border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="text-center">
          <Eyebrow className="justify-center">04 · Three Meta models</Eyebrow>
          <Headline
            text={"Three models.\nOne job each."}
            mark="Three"
            className={H2}
          />
          <Reveal>
            <p className="mx-auto mt-6 max-w-[32rem] text-[18px] leading-relaxed text-muted">
              Not a wrapper around one chat call. Each Meta model has one clear job, and every call shows up in the Agent
              Lens.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid border-[1.5px] border-line-strong sm:grid-cols-3">
          {MODELS.map((m, i) => (
            <motion.article
              key={m.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...SPRING, delay: i * 0.12 }}
              className={cn(
                "group grid grid-cols-[120px_1fr] border-line-strong bg-bg sm:flex sm:flex-col",
                i > 0 && "border-t-[1.5px] sm:border-t-0 sm:border-l-[1.5px]",
              )}
            >
              <div className="relative grid place-items-center overflow-hidden px-3 py-6 sm:px-6 sm:pt-12 sm:pb-10">
                <motion.div
                  whileHover={{ rotate: -6, y: -8, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                  className="relative"
                >
                  <Can name={m.name} version={m.version} tone={m.tone} />
                </motion.div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col border-l-[1.5px] border-line-strong p-4 sm:border-t-[1.5px] sm:border-l-0 sm:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[22px] leading-none font-bold text-ink sm:text-[24px]">
                    {m.name} {m.version}
                  </h3>
                </div>
                <p className="typed mt-2 text-[10px] text-muted">{m.flavor}</p>
                <p className="mt-3 text-[14px] leading-snug text-pretty text-muted sm:mt-4 sm:text-[15px]">{m.role}</p>
                <div className="min-h-4 flex-1 sm:min-h-5" />
                <p className="typed text-[10px] break-words text-lilac-ink">{m.spec}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
