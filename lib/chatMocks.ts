import type { Card } from "@/lib/schemas";

/** Deterministic Dive-in fixtures for META_MOCK=1 (e2e tests and demo safety net). */

export function mockChatReply(card: Card, messages: { role: string; content: string }[]): string {
  const ask = (messages.at(-1)?.content ?? "").toLowerCase();
  const who = card.source[0]?.label ?? "the source documents";
  if (ask.includes("why")) {
    return `${card.why} It comes from ${who}, and it is the kind of thing that gets more expensive the longer it waits. Everything in the draft is pulled from your own notes, so you can approve it as is.`;
  }
  if (ask.includes(" no") || ask.startsWith("no")) {
    return `If you pass, nothing goes out and I will drop it from your feed. The risk is that ${who} goes cold: a wholesale lead that waits more than two days usually signs with someone else. I can set a reminder for Friday instead, if you would rather decide after the Guji launch.`;
  }
  if (ask.includes("shorter") || ask.includes("formal")) {
    return `Done. I rewrote the draft: same facts, ${ask.includes("shorter") ? "about half the length" : "a more formal register"}. Have a look at the preview below and apply it if it reads right.`;
  }
  return `Good question. Based on ${who}, I would keep the core of "${card.title}" and only adjust the tone. Tell me what you want to change (price, timing, wording) and I will rewrite it.`;
}

const firstSentences = (text: string, n: number) => text.split(/(?<=[.!?])\s+/).slice(0, n).join(" ");

/** Greeting + the core paragraph (first two sentences) + the closing two paragraphs. */
const shorten = (text: string) => {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length < 4) return firstSentences(text, Math.max(1, Math.ceil(text.split(/(?<=[.!?])\s+/).length / 2)));
  const middle = paragraphs.slice(1, -2);
  const core = middle.reduce((a, b) => (b.length > a.length ? b : a));
  return [paragraphs[0], firstSentences(core, 2), ...paragraphs.slice(-2)].join("\n\n");
};

const formalize = (text: string) =>
  text
    .replace(/^(Hi|Hey|Hello)\s+([^,\n]+),?/i, "Dear $2,")
    .replace(/\bthanks\b/gi, "Thank you")
    .replace(/!+/g, ".")
    .replace(/\b(Cheers|Best|Thx),?/i, "Kind regards,");

export function mockRevision(card: Card, instruction: string): Card["payload"] {
  const i = instruction.toLowerCase();
  const rewrite = (text: string) => {
    if (i.includes("short")) return shorten(text);
    if (i.includes("formal")) return formalize(text);
    return `${text}\n\n(${instruction})`;
  };
  switch (card.kind) {
    case "email_reply":
      return { ...card.payload, body: rewrite(card.payload.body) };
    case "team_update":
      return { ...card.payload, message: rewrite(card.payload.message) };
    case "schedule":
      return { ...card.payload, message: rewrite(card.payload.message) };
    case "social_post":
      return { ...card.payload, caption: rewrite(card.payload.caption) };
    case "insight":
      return { ...card.payload, detail: rewrite(card.payload.detail) };
    case "task":
      return i.includes("short") ? { steps: card.payload.steps.slice(0, 3) } : card.payload;
    default:
      return card.payload;
  }
}
