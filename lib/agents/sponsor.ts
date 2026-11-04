import "server-only";
import { z } from "zod";
import { chatJSON, type Tracer } from "../meta";
import { persona } from "../persona";
import { mockSponsorPick } from "../mocks";
import type { Card } from "../schemas";
import { systemPrompt } from "./prompts";

/** Sponsor matcher: picks the one fictional sponsor that fits her plans this week. */
export async function pickSponsor(opts: { id: string; batch: number; excludeBrands: string[]; trace: Tracer }): Promise<Card> {
  const candidates = persona.sponsors.filter((s) => !opts.excludeBrands.includes(s.brand));
  const pool = candidates.length ? candidates : persona.sponsors;

  const schema = z.object({
    sponsorId: z.enum(pool.map((s) => s.id) as [string, ...string[]]),
    reason: z.string(),
    offer: z.string(),
    cta: z.string(),
  });
  const pick = await chatJSON({
    step: "Sponsor match",
    name: "sponsor_pick",
    schema,
    messages: [
      { role: "system", content: systemPrompt("the Sponsor matcher") },
      {
        role: "user",
        content: [
          `HER GOALS THIS WEEK: ${persona.profile.goalsThisWeek.join("; ")}`,
          `HER NOTES:\n${persona.notes}`,
          `HER CALENDAR: ${persona.calendar.map((c) => `${c.title} (${c.start})`).join("; ")}`,
          "",
          "SPONSORS:",
          ...pool.map((s) => `- ${s.id}: ${s.brand} (${s.category}). Offer: ${s.offer}. CTA: ${s.cta}. Relevant when: ${s.matchesWhen}`),
          "",
          "Pick the single sponsor most useful for her actual plans this week.",
          "reason: ≤ 110 chars, starts with her concrete plan, then the link to the offer (e.g. \"Launching Guji on Friday → …\").",
          "offer: the sponsor's offer, ≤ 60 chars. cta: 2–3 words.",
        ].join("\n"),
      },
    ],
    mock: () => mockSponsorPick(pool, opts.batch),
    trace: opts.trace,
  });

  const sponsor = pool.find((s) => s.id === pick.sponsorId) ?? pool[0];
  const reason = pick.reason.length > 120 ? `${pick.reason.slice(0, 119).trimEnd()}…` : pick.reason;
  return {
    id: opts.id,
    kind: "sponsored",
    title: sponsor.brand,
    why: reason,
    source: [{ id: sponsor.id, type: "sponsor", label: sponsor.category }],
    urgency: 1,
    payload: { offer: pick.offer || sponsor.offer, cta: pick.cta || sponsor.cta },
    actionLabel: pick.cta || sponsor.cta,
    sponsored: { brand: sponsor.brand, reason },
    createdAt: Date.now(),
    status: "ready",
  };
}
