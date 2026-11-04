import "server-only";
import { z } from "zod";
import { chatJSON, type Tracer } from "../meta";
import { persona, salesSeries, salesSummary, sourceRef } from "../persona";
import { mockPrepared } from "../mocks";
import { PAYLOAD_SCHEMAS, type Card, type Opportunity, type PayloadOf, type SourceRef } from "../schemas";
import { systemPrompt } from "./prompts";

type PreparedKind = Opportunity["kind"];

/** Preparer: does the full work behind one opportunity and returns a ready card. */
export async function prepare(opportunity: Opportunity, opts: { id: string; trace: Tracer }): Promise<Card> {
  const { kind } = opportunity;
  const facts = kind === "team_update" ? salesFacts() : undefined;
  const slots = kind === "schedule" ? freeSlots(opportunity.sourceIds) : [];

  const schema = z.object({ payload: PAYLOAD_SCHEMAS[kind], actionLabel: z.string() });
  const out = await chatJSON({
    step: `Preparer · ${kind}`,
    name: `prepare_${kind}`,
    schema,
    messages: [
      { role: "system", content: systemPrompt(`the ${kind} Preparer`) },
      { role: "user", content: preparerPrompt(opportunity, facts, slots) },
    ],
    mock: () => mockPrepared(opportunity, { metrics: facts?.metrics ?? [], slots }),
    trace: opts.trace,
  });

  const payload = finalize(kind, out.payload, facts, slots);
  // If code had to replace the model's slot, its label ("Move to Thu 9 AM") no longer matches.
  const slotReplaced =
    kind === "schedule" &&
    (payload as PayloadOf<"schedule">).proposed.start !== (out.payload as PayloadOf<"schedule">).proposed.start;
  return {
    id: opts.id,
    kind,
    title: opportunity.title,
    why: opportunity.why,
    source: opportunity.sourceIds.map(sourceRef).filter((s): s is SourceRef => Boolean(s)),
    urgency: opportunity.urgency,
    payload,
    actionLabel: (!slotReplaced && out.actionLabel.trim()) || DEFAULT_ACTION[kind],
    createdAt: Date.now(),
    status: "ready",
    ...(kind === "social_post" ? { imageStatus: "loading" as const } : {}),
  } as Card;
}

/** Live label shown on the skeleton while the Preparer works. */
export function skeletonLabel(o: Opportunity): string {
  const email = persona.inbox.find((e) => o.sourceIds.includes(e.id));
  const event = persona.calendar.find((c) => o.sourceIds.includes(c.id));
  switch (o.kind) {
    case "email_reply":
      return email ? `Drafting reply to ${email.from.name.split(" ")[0]}…` : "Drafting reply…";
    case "team_update":
      return "Pulling yesterday's sales…";
    case "schedule":
      return event ? `Resolving ${weekday(event.start)} conflict…` : "Finding a free slot…";
    case "social_post":
      return "Writing launch caption…";
    case "task":
      return "Breaking it into steps…";
    case "insight":
      return "Crunching the numbers…";
  }
}

const DEFAULT_ACTION: Record<PreparedKind, string> = {
  email_reply: "Send reply",
  team_update: "Post update",
  schedule: "Move meeting",
  social_post: "Schedule post",
  task: "Add to tasks",
  insight: "Save insight",
};

const KIND_BRIEF: Record<PreparedKind, string> = {
  email_reply: [
    "Write the reply email in her voice. `to` is \"Full Name <email>\" of the sender, `subject` starts with \"Re: \".",
    "Body: plain text, 60–120 words, 3–5 short paragraphs. Open with \"Hi <first name>,\" then get to the point. Answer every question in the email with concrete facts from the context (prices, dates, terms). End with her signature exactly as given.",
    'actionLabel: "Send reply".',
  ].join("\n"),
  team_update: [
    "Write a short team chat message (3–5 lines, friendly, specific) sharing the sales numbers below and one clear takeaway or ask for the team.",
    "Use ONLY the numbers given in SALES FACTS, never compute or invent others. `channel` is the team channel, e.g. \"#team\".",
    "metrics: copy the SALES FACTS metrics exactly. series: copy the SALES FACTS series exactly.",
    'actionLabel like "Post to #team".',
  ].join("\n"),
  schedule: [
    "Resolve the scheduling problem. `event`: the event to move or book (its title). `conflict`: what it clashes with, or what needs a time, one short line.",
    "`proposed`: if a source email offers specific times, use the one that fits her calendar (ISO, e.g. 2026-11-12T14:00:00); otherwise copy one of FREE SLOTS exactly.",
    "`message`: a short, warm note to the other party proposing the new time, in her voice, signed with her first name.",
    'actionLabel like "Move to Thu 3:00 PM" or "Book Thu Nov 12, 2 PM".',
  ].join("\n"),
  social_post: [
    "Write an Instagram post for the launch. `platform`: \"instagram\". `caption`: 2–4 short lines, sensory and specific (origin, process, tasting notes, launch day), one call to action, at most 2 emoji. `hashtags`: 4–6 without spaces, starting with #.",
    "`imagePrompt`: a detailed prompt for a photographic image model: specialty coffee product shot, the subject, setting, props, natural light, lens and mood. Editorial, warm, minimal. No text, no logos, no lettering in the image.",
    'actionLabel: "Schedule post".',
  ].join("\n"),
  task: [
    "Turn it into 3–5 concrete, ordered steps (each ≤ 70 chars, starting with a verb, with names, amounts and dates from the context).",
    'actionLabel: "Add to tasks".',
  ].join("\n"),
  insight: [
    "Surface one sharp insight from the data. `headline` ≤ 60 chars, `detail` 1–2 sentences with the evidence and what to do about it, `stat` a big short number taken from the data (e.g. \"+38%\", \"3×\").",
    'actionLabel: "Save insight".',
  ].join("\n"),
};

function preparerPrompt(o: Opportunity, facts: SalesFacts | undefined, slots: Slot[]): string {
  const p = persona.profile;
  const parts = [
    `CARD: ${o.title}`,
    `WHY: ${o.why}`,
    "",
    "SOURCES:",
    ...o.sourceIds.map(sourceDetail),
    "",
    `HER SIGNATURE:\n${p.signature}`,
    `TEAM: ${p.team.map((t) => `${t.name} (${t.role}, ${t.handle})`).join(", ")}`,
    `GOALS THIS WEEK: ${p.goalsThisWeek.join("; ")}`,
  ];
  if (!o.sourceIds.includes("notes")) parts.push("", `HER NOTES:\n${persona.notes}`);
  if (facts) parts.push("", "SALES FACTS:", JSON.stringify(facts, null, 1));
  if (o.kind === "schedule") {
    parts.push("", "HER CALENDAR:", ...persona.calendar.map(eventLine));
    parts.push("", "FREE SLOTS (already clear of her calendar, with travel buffer):", ...slots.map((s) => `- ${s.start} → ${s.end}`));
  }
  parts.push("", "INSTRUCTIONS:", KIND_BRIEF[o.kind]);
  return parts.join("\n");
}

/** Enforce what must come from code, not from the model. */
function finalize<K extends PreparedKind>(kind: K, payload: PayloadOf<K>, facts: SalesFacts | undefined, slots: Slot[]): PayloadOf<K> {
  if (kind === "team_update" && facts) {
    const p = payload as PayloadOf<"team_update">;
    return { ...p, metrics: facts.metrics, series: facts.series } as PayloadOf<K>;
  }
  if (kind === "schedule" && slots.length) {
    const p = payload as PayloadOf<"schedule">;
    return (isFree(p.proposed) ? p : { ...p, proposed: slots[0] }) as PayloadOf<K>;
  }
  if (kind === "social_post") {
    const p = payload as PayloadOf<"social_post">;
    const hashtags = p.hashtags.map((h) => `#${h.replace(/^#+/, "").replace(/\s+/g, "")}`).slice(0, 6);
    return { ...p, hashtags } as PayloadOf<K>;
  }
  return payload;
}

// ---------- Source lookup ----------

function sourceDetail(id: string): string {
  const email = persona.inbox.find((e) => e.id === id);
  if (email) {
    const from = `${email.from.name} <${email.from.email}>${email.from.company ? `, ${email.from.company}` : ""}`;
    return `[${id}] EMAIL from ${from}, received ${email.receivedAt}\nSubject: ${email.subject}\n${email.body}`;
  }
  const event = persona.calendar.find((c) => c.id === id);
  if (event) return `[${id}] ${eventLine(event)}`;
  if (id === "sales") return `[sales] Sales log: see SALES FACTS when given.`;
  if (id === "notes") return `[notes] HER NOTES:\n${persona.notes}`;
  return `[${id}] ${sourceRef(id)?.label ?? "unknown source"}`;
}

function eventLine(c: Persona["calendar"][number]): string {
  return `[${c.id}] ${c.title}: ${c.start} → ${c.end}${c.with.length ? `, with ${c.with.join(", ")}` : ""}${c.location ? `, at ${c.location}` : ""}`;
}

type Persona = typeof persona;

// ---------- Sales facts (computed, never invented) ----------

type SalesFacts = {
  day: string;
  metrics: { label: string; value: string; delta: string }[];
  series: number[];
  lowStock?: string;
};

function salesFacts(): SalesFacts {
  const s = salesSummary();
  const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const delta = (pct: number) => `${pct >= 0 ? "+" : ""}${Math.round(pct)}% vs 7-day avg`;
  return {
    day: s.date,
    metrics: [
      { label: "Revenue", value: money(s.yesterday), delta: delta(s.deltaPct) },
      { label: "Web", value: money(s.byChannel.web.yesterday), delta: delta(s.byChannel.web.deltaPct) },
      { label: "Wholesale", value: money(s.byChannel.wholesale.yesterday), delta: delta(s.byChannel.wholesale.deltaPct) },
    ],
    series: salesSeries(14),
    lowStock: s.lowStock ? `${s.lowStock.product}: ${s.lowStock.bagsLeft} bags left, about ${s.lowStock.daysLeft} days` : undefined,
  };
}

// ---------- Free calendar slots (computed, never invented) ----------

type Slot = { start: string; end: string };

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const BUFFER_MIN = 30;

/** Up to 6 free weekday slots (9–18h) from the day of the clash, sized like the cited events. */
function freeSlots(sourceIds: string[]): Slot[] {
  const cited = persona.calendar.filter((c) => sourceIds.includes(c.id));
  const durationMin = Math.max(30, ...cited.map((c) => toMin(c.end) - toMin(c.start)));
  const nowMin = toMin(persona.profile.now);
  const firstDay = Math.floor(Math.max(nowMin, ...cited.map((c) => toMin(c.start))) / 1440);

  const slots: Slot[] = [];
  for (let day = firstDay; day <= firstDay + 3 && slots.length < 6; day++) {
    for (let m = day * 1440 + DAY_START; m + durationMin <= day * 1440 + DAY_END && slots.length < 6; m += 30) {
      const slot = { start: fromMin(m), end: fromMin(m + durationMin) };
      if (!isFree(slot)) continue;
      slots.push(slot);
      m += 90; // spread the options out
    }
  }
  return slots;
}

/** A slot is valid if it is a future weekday business-hours slot with 30 min of travel buffer around every event. */
function isFree(slot: Slot): boolean {
  const s = toMin(slot.start);
  const e = toMin(slot.end);
  if (!s || e <= s || s < toMin(persona.profile.now) + 60) return false;
  const day = Math.floor(s / 1440);
  const dow = new Date(day * 86_400_000).getUTCDay();
  if (dow === 0 || dow === 6 || s - day * 1440 < DAY_START || e - day * 1440 > DAY_END) return false;
  return !persona.calendar.some((c) => s < toMin(c.end) + BUFFER_MIN && e + BUFFER_MIN > toMin(c.start));
}

/** ISO local datetime → minutes since epoch, treating the wall clock as UTC (no timezone math). */
function toMin(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60_000;
}

function fromMin(min: number): string {
  return new Date(min * 60_000).toISOString().slice(0, 19);
}

function weekday(iso: string): string {
  return new Date(toMin(iso) * 60_000).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
