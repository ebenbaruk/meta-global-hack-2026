import type { Card } from "@/lib/schemas";

type SponsoredCard = Extract<Card, { kind: "sponsored" }>;

/**
 * The partner's own little ad, on a yellow "can". The brand is already the card title and the
 * CTA is the card's approve pill, so the can only carries the offer itself.
 */
export function SponsoredBody({ card }: { card: SponsoredCard }) {
  const { offer } = card.payload;
  const brand = card.sponsored?.brand ?? card.title;

  return (
    <div className="relative flex min-w-0 items-start gap-3.5 overflow-hidden rounded-[20px] border-[1.5px] border-onpastel bg-yellow p-4 text-onpastel">
      <span
        aria-hidden
        className="font-display grid size-12 shrink-0 -rotate-6 place-items-center rounded-full border-[1.5px] border-onpastel bg-lilac text-[22px] font-black text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)]"
      >
        {brand.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="typed text-[9.5px] font-bold">The offer</p>
        <p className="font-display mt-1 text-[19px] leading-[1.15] font-bold text-balance break-words">{offer}</p>
      </div>
    </div>
  );
}
