import { ArrowUpRight } from "lucide-react";
import type { Card } from "@/lib/schemas";

type SponsoredCard = Extract<Card, { kind: "sponsored" }>;

/** Offer block. The real action and the "Why am I seeing this?" popover live in the card shell. */
export function SponsoredBody({ card }: { card: SponsoredCard }) {
  const { offer, cta } = card.payload;
  const brand = card.sponsored?.brand ?? card.title;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-sponsor/20 bg-gradient-to-br from-sponsor/[0.09] via-elevated/60 to-elevated/60 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(245 200 106 / 0.35), transparent 70%)" }}
      />
      <div className="relative flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-sponsor/30 bg-sponsor/10 text-base font-semibold text-sponsor"
        >
          {brand.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-fg">{brand}</div>
          <div className="text-[11px] font-medium tracking-wide text-sponsor/80 uppercase">Sponsored</div>
        </div>
      </div>
      <p className="relative mt-3 text-[14px] leading-[1.5] break-words text-fg/85">{offer}</p>
      <div className="relative mt-4 flex">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-sponsor/30 bg-sponsor/10 px-3.5 py-1.5 text-sm font-medium text-sponsor">
          <span className="truncate">{cta}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </div>
  );
}
