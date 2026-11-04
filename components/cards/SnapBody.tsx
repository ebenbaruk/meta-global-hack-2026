"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Card } from "@/lib/schemas";

type SnapCard = Extract<Card, { kind: "snap" }>;
type SnapObject = SnapCard["payload"]["objects"][number];

/** One color per concept, so "Invoice" and "Guji sack" read as separate finds. */
const PALETTE = ["var(--color-mint)", "var(--color-yellow)", "var(--color-lilac)", "var(--color-tangerine)"];

/** Below this share of the photo an object is outlined but not labeled (single beans, crumbs). */
const MIN_CHIP_AREA = 0.02;

/** At most this many labels get a chip (vision lists the most important first). */
const MAX_CHIPS = 3;

/** Group outlines by label; the first (largest) instance of each label carries the chip if it is big enough. */
function byLabel(objects: SnapObject[], width: number, height: number) {
  const labels = [...new Set(objects.map((o) => o.label))];
  return objects.map((o, i) => {
    const share = ((o.box.x2 - o.box.x1) * (o.box.y2 - o.box.y1)) / (width * height);
    return {
      ...o,
      color: PALETTE[labels.indexOf(o.label) % PALETTE.length],
      chip:
        objects.findIndex((x) => x.label === o.label) === i &&
        share >= MIN_CHIP_AREA &&
        labels.indexOf(o.label) < MAX_CHIPS,
    };
  });
}

const inBox = (b: SnapObject["box"], x: number, y: number) => x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;

export function SnapBody({ card }: { card: SnapCard }) {
  const { summary, width, height, objects, lines } = card.payload;
  const reduce = useReducedMotion();
  const items = byLabel(objects, width, height);
  const total = lines.find((l) => /total/i.test(l.label));
  const rows = lines.filter((l) => l !== total);
  const found = new Set(objects.map((o) => o.label)).size;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        className="relative w-full overflow-hidden rounded-[20px] border border-line bg-elevated"
        style={{ aspectRatio: `${width} / ${height}` }}
        data-testid="snap-photo"
      >
        {card.image && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL photo, nothing to optimize
          <img src={card.image} alt={card.why || "Your photo"} className="absolute inset-0 size-full object-cover" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-onpastel/10 via-transparent to-onpastel/40" />

        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-mint/45 to-transparent"
            initial={{ top: "-25%", opacity: 1 }}
            animate={{ top: "105%", opacity: 0 }}
            transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
          />
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          {items.map((o, i) => (
            <motion.path
              key={i}
              d={o.svgPath}
              fill={o.color}
              stroke={o.color}
              strokeWidth={o.chip ? 2.5 : 1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? { fillOpacity: 0.12, pathLength: 1 } : { pathLength: 0, fillOpacity: 0, opacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 0.12, opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      pathLength: { duration: 1.1, delay: 0.25 + i * 0.08, ease: "easeInOut" },
                      opacity: { duration: 0.2, delay: 0.25 + i * 0.08 },
                      fillOpacity: { duration: 0.6, delay: 1.1 + i * 0.08 },
                    }
              }
            />
          ))}
        </svg>

        {items
          .filter((o) => o.chip)
          .map((o, i) => {
            const left = (o.box.x1 / width) * 100;
            const right = 100 - (o.box.x2 / width) * 100;
            const top = (o.box.y1 / height) * 100;
            const flip = left > 50; // right-half objects anchor to their right edge so chips never overflow
            // Above the outline unless that spot is the top edge or sits on another find (then just inside it).
            const ax = flip ? o.box.x2 - width * 0.1 : o.box.x1 + width * 0.1;
            const ay = o.box.y1 - height * 0.03;
            const above = top > 8 && !items.some((x) => x !== o && inBox(x.box, ax, ay));
            return (
              <motion.span
                key={o.label}
                className="absolute flex items-center gap-1.5 rounded-full border-[1.5px] border-onpastel bg-surface py-1 pr-2.5 pl-1.5 text-[11.5px] font-semibold text-ink shadow-[2px_2px_0_0_var(--color-onpastel)]"
                style={{
                  ...(above ? { bottom: `calc(${100 - top}% + 6px)` } : { top: `calc(${top}% + 8px)` }),
                  maxWidth: "calc(50% - 8px)",
                  ...(flip ? { right: `calc(${right}% + 8px)` } : { left: `calc(${left}% + 8px)` }),
                }}
                initial={reduce ? false : { opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 28, delay: reduce ? 0 : 0.9 + i * 0.12 }}
              >
                <span className="size-2.5 shrink-0 rounded-full border border-onpastel" style={{ background: o.color }} />
                <span className="truncate">{o.label}</span>
              </motion.span>
            );
          })}

        {objects.length > 0 && (
          <span className="typed absolute right-2.5 bottom-2.5 rotate-[-3deg] rounded-full border-[1.5px] border-onpastel bg-yellow px-2 py-1 text-[9.5px] leading-none font-bold text-onpastel">
            SAM 3.1 · {found} {found === 1 ? "object" : "objects"}
          </span>
        )}
      </div>

      <p className="text-[14.5px] leading-[1.5] text-ink">{summary}</p>

      {lines.length > 0 && (
        <div className="relative min-w-0 rounded-[20px] border border-line bg-bg px-4 pt-3 pb-3.5">
          <div className="typed flex items-center justify-between text-[9.5px] text-faint">
            <span>Read off the photo</span>
            <span>Ready to log</span>
          </div>
          <dl className="mt-2 font-mono text-[12px]">
            {rows.map((l, i) => (
              <div key={i} className="flex items-baseline gap-2 py-1">
                <dt className="min-w-0 truncate text-muted">{l.label}</dt>
                <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-line-strong/40" />
                <dd className="shrink-0 text-ink tabular-nums">{l.amount}</dd>
              </div>
            ))}
            {total && (
              <div className="mt-2 flex items-baseline gap-3 border-t-[1.5px] border-dashed border-line-strong pt-2.5">
                <dt className="typed flex-1 text-[11px] text-ink">{total.label}</dt>
                <dd className="font-display text-[26px] leading-none font-black text-ink tabular-nums">{total.amount}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
