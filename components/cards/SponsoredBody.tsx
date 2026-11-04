import { ArrowUpRight } from "lucide-react";
import type { Card } from "@/lib/schemas";

type SponsoredCard = Extract<Card, { kind: "sponsored" }>;

/** The partner's own little ad, on a yellow "can". The real action and "Why am I seeing this?" live in the card shell. */
export function SponsoredBody({ card }: { card: SponsoredCard }) {
  const { offer, cta } = card.payload;
  const brand = card.sponsored?.brand ?? card.title;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] border-[1.5px] border-onpastel bg-yellow p-4 text-onpastel">
      <div className="relative flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="font-display grid size-11 shrink-0 -rotate-6 place-items-center rounded-full border-[1.5px] border-onpastel bg-surface text-[20px] font-black text-ink"
        >
          {brand.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-display truncate text-[22px] leading-tight font-black">{brand}</div>
          <div className="typed text-[9.5px] opacity-70">Partner offer</div>
        </div>
      </div>
      <p className="relative mt-3 text-[14.5px] leading-[1.5] break-words">{offer}</p>
      <div className="relative mt-4 flex">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border-[1.5px] border-onpastel bg-surface px-3.5 py-1.5 text-[13.5px] font-semibold text-ink">
          <span className="truncate">{cta}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </div>
  );
}
