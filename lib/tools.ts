import { TOOL_BY_KIND, type Card, type Receipt } from "./schemas";

/**
 * Sandboxed tools behind Approve. Nothing leaves the sandbox: each tool is a
 * deterministic mock that returns a human receipt for the Outbox.
 */

const delayFor = (id: string) => 300 + (hash(id) % 300); // 300–600 ms, stable per card

export async function executeCard(card: Card): Promise<Receipt> {
  await new Promise((r) => setTimeout(r, delayFor(card.id)));
  const { title, detail } = describe(card);
  return {
    id: `r_${card.id}`,
    cardId: card.id,
    kind: card.kind,
    tool: TOOL_BY_KIND[card.kind],
    title,
    detail,
    at: Date.now(),
  };
}

function describe(card: Card): { title: string; detail: string } {
  switch (card.kind) {
    case "email_reply":
      return { title: `Reply sent to ${nameOf(card.payload.to)}`, detail: card.payload.subject };
    case "team_update":
      return { title: `Posted to ${card.payload.channel}`, detail: firstLine(card.payload.message) };
    case "schedule":
      return { title: `${card.payload.event} moved`, detail: `New slot ${formatSlot(card.payload.proposed.start, card.payload.proposed.end)}` };
    case "social_post":
      return { title: `Scheduled on ${capitalize(card.payload.platform)}`, detail: firstLine(card.payload.caption) };
    case "task":
      return { title: "Added to your tasks", detail: `${card.title} · ${card.payload.steps.length} steps` };
    case "insight":
      return { title: "Saved as a task", detail: card.payload.headline };
    case "snap":
      return { title: "Expense logged", detail: card.payload.summary };
    case "sponsored":
      return { title: `Offer opened: ${card.sponsored?.brand ?? card.title}`, detail: card.payload.offer };
  }
}

/** "Lena Ortiz <lena@bloomcafe.com>" → "Lena Ortiz"; a bare email stays as is. */
function nameOf(to: string): string {
  const m = to.match(/^\s*"?([^"<]+?)"?\s*</);
  return m ? m[1] : to;
}

function firstLine(text: string, max = 80): string {
  const line = text.split("\n").find((l) => l.trim()) ?? "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** Slots are ISO local datetimes ("2026-11-05T15:00"): format the wall-clock time as written. */
function formatSlot(start: string, end: string): string {
  const s = wallClock(start);
  const e = wallClock(end);
  if (!s) return start;
  const day = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return e ? `${day}, ${time(s)}–${time(e)}` : `${day}, ${time(s)}`;
}

function wallClock(iso: string): Date | undefined {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : undefined;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
