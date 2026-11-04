import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Persona, SourceRef } from "@/lib/schemas";
import profile from "@/data/persona/profile.json";
import inbox from "@/data/persona/inbox.json";
import calendar from "@/data/persona/calendar.json";
import sales from "@/data/persona/sales.json";
import sponsors from "@/data/sponsors.json";

type Channel = Persona["sales"][number]["channel"];
const CHANNELS: Channel[] = ["web", "wholesale", "cafe"];

/** Roasted 12 oz bags on hand this morning (mirrors notes.md and Priya's email e12). */
const ROASTED_STOCK: Record<string, number> = {
  "Ember House Blend": 96,
  "Oak Street Espresso": 58,
  "Colombia Huila Washed": 24,
  "Swiss Water Decaf": 31,
};
const LOW_STOCK_DAYS = 4;

export const persona: Persona = {
  profile,
  inbox,
  calendar,
  sales: sales as Persona["sales"],
  notes: fs.readFileSync(path.join(process.cwd(), "data/persona/notes.md"), "utf8"),
  sponsors,
};

const allIds = [...persona.inbox, ...persona.calendar, ...persona.sponsors].map((x) => x.id);
if (new Set(allIds).size !== allIds.length) throw new Error("persona: duplicate ids");

// ---------- Sales ----------

const dates = [...new Set(persona.sales.map((s) => s.date))].sort();

const round = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (value: number, base: number) => (base === 0 ? 0 : Math.round(((value - base) / base) * 1000) / 10);

function revenueOn(date: string, channel?: Channel): number {
  return sum(persona.sales.filter((s) => s.date === date && (!channel || s.channel === channel)).map((s) => s.revenue));
}

/** Total revenue per day, oldest → newest (last entry = yesterday, the last full day). */
export function salesSeries(days = 14): number[] {
  return dates.slice(-days).map((d) => round(revenueOn(d)));
}

interface Trend {
  yesterday: number;
  avg7: number;
  deltaPct: number;
}

function trend(channel?: Channel): Trend {
  const prior = dates.slice(-8, -1);
  const avg7 = sum(prior.map((d) => revenueOn(d, channel))) / prior.length;
  const y = revenueOn(dates[dates.length - 1], channel);
  return { yesterday: round(y), avg7: round(avg7), deltaPct: pct(y, avg7) };
}

export interface SalesSummary extends Trend {
  date: string; // the "yesterday" date (last full day of data)
  byChannel: Record<Channel, Trend>;
  lowStock?: { product: string; bagsLeft: number; daysLeft: number };
}

/** Yesterday vs the 7 days before it, overall and per channel, plus the product about to run out. */
export function salesSummary(): SalesSummary {
  const byChannel = Object.fromEntries(CHANNELS.map((c) => [c, trend(c)])) as Record<Channel, Trend>;
  const last7 = new Set(dates.slice(-7));
  const lowStock = Object.entries(ROASTED_STOCK)
    .map(([product, bagsLeft]) => {
      // Retail bags leave through the web shop (café units are drinks, wholesale units are 5 lb bags).
      const webUnits = persona.sales.filter((s) => s.product === product && s.channel === "web" && last7.has(s.date));
      const perDay = sum(webUnits.map((s) => s.units)) / 7;
      return { product, bagsLeft, daysLeft: perDay ? Math.round((bagsLeft / perDay) * 10) / 10 : Infinity };
    })
    .filter((p) => p.daysLeft < LOW_STOCK_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  return { date: dates[dates.length - 1], ...trend(), byChannel, lowStock };
}

function productLines(): string[] {
  const last7 = dates.slice(-7);
  const prev7 = dates.slice(-14, -7);
  const products = [...new Set(persona.sales.map((s) => s.product))];
  return products.map((p) => {
    const rows = (ds: string[]) => persona.sales.filter((s) => s.product === p && ds.includes(s.date));
    const now = rows(last7);
    const rev = sum(now.map((s) => s.revenue));
    const units = CHANNELS.map((c) => {
      const u = sum(now.filter((s) => s.channel === c).map((s) => s.units));
      return u ? `${c} ${u}` : null;
    }).filter(Boolean);
    const delta = pct(rev, sum(rows(prev7).map((s) => s.revenue)));
    return `- ${p}: ${money(rev)} (${signed(delta)} vs prior week) · units ${units.join(", ")}`;
  });
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;

function weekday(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

// ---------- Prompt context ----------

/** Compact text rendering of the whole sandbox for LLM prompts. Ids in brackets are citable sourceIds. */
export function personaContext(): string {
  const p = persona.profile;
  const s = salesSummary();
  const out: string[] = [
    `# ${p.name}, ${p.role} of ${p.company} (${p.city})`,
    `Now: ${p.now} (${weekday(p.now)}). Tone: ${p.tone} Signs emails "${p.signature}".`,
    `Team: ${p.team.map((t) => `${t.name} ${t.handle} (${t.role})`).join("; ")}.`,
    "Goals this week:",
    ...p.goalsThisWeek.map((g) => `- ${g}`),
    "",
    "# Inbox",
  ];

  for (const e of persona.inbox) {
    const from = e.from.company ? `${e.from.name}, ${e.from.company}` : e.from.name;
    out.push(
      `[${e.id}] From: ${from} <${e.from.email}> · ${e.receivedAt} · labels: ${e.labels.join(", ")}`,
      `Subject: ${e.subject}`,
      e.body.replace(/\s*\n\s*/g, " ").trim(),
      "",
    );
  }

  out.push("# Calendar (Mon Nov 2 – Sun Nov 8)");
  for (const c of persona.calendar) {
    const who = c.with.length ? ` · with ${c.with.join(", ")}` : "";
    const where = c.location ? ` · @ ${c.location}` : "";
    out.push(`[${c.id}] ${weekday(c.start)} ${c.start.slice(0, 10)} ${c.start.slice(11, 16)}–${c.end.slice(11, 16)} ${c.title}${who}${where}`);
  }

  out.push("", "# [sales] Sales, last 14 days (USD revenue per day by channel)");
  for (const d of dates.slice(-14)) {
    out.push(`${d.slice(5)} ${weekday(d)}: ${money(revenueOn(d))} (${CHANNELS.map((c) => `${c} ${money(revenueOn(d, c))}`).join(", ")})`);
  }
  out.push(
    "Per product, last 7 days:",
    ...productLines(),
    "Trends (computed):",
    `- Yesterday (${s.date}) total ${money(s.yesterday)} vs 7-day avg ${money(s.avg7)} (${signed(s.deltaPct)}).`,
    ...CHANNELS.map((c) => {
      const t = s.byChannel[c];
      return `- ${c}: yesterday ${money(t.yesterday)} vs avg ${money(t.avg7)} (${signed(t.deltaPct)}).`;
    }),
  );
  if (s.lowStock) {
    out.push(`- Low stock: ${s.lowStock.product}, ${s.lowStock.bagsLeft} bags left ≈ ${s.lowStock.daysLeft} days at current web pace.`);
  }

  out.push("", "# [notes] Maya's notes", persona.notes.trim());
  return out.join("\n");
}

// ---------- Source references ----------

const short = (s: string, max = 40) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

/** Resolves a sourceId cited by the model ("e3", "c5", "sales", "notes", "sp2") to a chip label. */
export function sourceRef(id: string): SourceRef | undefined {
  if (id === "sales") return { id, type: "sales", label: "Sales · last 14 days" };
  if (id === "notes") return { id, type: "note", label: "Maya's notes" };
  const email = persona.inbox.find((e) => e.id === id);
  if (email) return { id, type: "email", label: short(`${email.from.name} · ${email.subject}`) };
  const event = persona.calendar.find((c) => c.id === id);
  if (event) return { id, type: "event", label: short(`${weekday(event.start)} ${event.start.slice(11, 16)} · ${event.title}`) };
  const sponsor = persona.sponsors.find((s) => s.id === id);
  if (sponsor) return { id, type: "sponsor", label: short(`${sponsor.brand} · ${sponsor.category}`) };
  return undefined;
}
