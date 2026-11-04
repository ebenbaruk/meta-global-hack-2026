import "server-only";
import { z } from "zod";
import { chatJSON, chatStream, MODELS, type Tracer } from "@/lib/meta";
import { persona, personaContext } from "@/lib/persona";
import { CardKind, PAYLOAD_SCHEMAS, SourceRef, type Card } from "@/lib/schemas";
import { mockChatReply, mockRevision } from "@/lib/chatMocks";

export const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/** The parts of a card the chat needs, with the payload checked against its kind. */
export const CardInput = z
  .looseObject({
    id: z.string(),
    kind: CardKind,
    title: z.string(),
    why: z.string(),
    source: z.array(SourceRef),
    payload: z.unknown(),
  })
  .superRefine((card, ctx) => {
    const parsed = PAYLOAD_SCHEMAS[card.kind].safeParse(card.payload);
    if (!parsed.success) ctx.addIssue({ code: "custom", path: ["payload"], message: `Invalid ${card.kind} payload` });
  })
  .transform((card) => card as unknown as Card);

/** Chat model for Dive in. Picked after a live comparison, see docs/BUILD_NOTES.md. */
const CHAT_MODEL = MODELS.spark;

/** Full content of the documents a card was built from. */
function sourceDocuments(card: Card): string {
  const docs = card.source.map((ref) => {
    const email = persona.inbox.find((e) => e.id === ref.id);
    if (email) {
      return `EMAIL ${email.id} from ${email.from.name}${email.from.company ? ` (${email.from.company})` : ""} <${email.from.email}>, ${email.receivedAt}\nSubject: ${email.subject}\n${email.body}`;
    }
    const event = persona.calendar.find((c) => c.id === ref.id);
    if (event) return `EVENT ${event.id}: ${JSON.stringify(event)}`;
    if (ref.type === "sales") return "SALES: see the [sales] section of the context below.";
    if (ref.type === "note") return "NOTES: see the [notes] section of the context below.";
    return `${ref.type.toUpperCase()} ${ref.id}: ${ref.label}`;
  });
  return [...new Set(docs)].join("\n\n---\n\n");
}

function systemPrompt(card: Card): string {
  const { name, company } = persona.profile;
  return [
    `You are ${name}'s agent at ${company}. You prepared the card below in her feed and she has opened it to talk it through with you.`,
    `Answer concisely: 120 words max unless she asks for more. Be concrete (names, numbers, dates from the documents). Plain text, no markdown headings. If a change would help, propose it and quote the new wording. Never invent facts that are not in the documents.`,
    `CARD (${card.kind}): ${card.title}\nWhy it is in the feed: ${card.why}\nPrepared payload: ${JSON.stringify(card.payload)}`,
    `SOURCE DOCUMENTS:\n${sourceDocuments(card)}`,
    `CONTEXT ABOUT ${name.toUpperCase()}:\n${personaContext()}`,
  ].join("\n\n");
}

export function chatReply(card: Card, messages: ChatMessage[], trace?: Tracer): AsyncGenerator<string> {
  return chatStream({
    step: `Dive in · ${card.kind}`,
    model: CHAT_MODEL,
    messages: [{ role: "system", content: systemPrompt(card) }, ...messages],
    mock: () => mockChatReply(card, messages),
    trace,
  });
}

export async function revisePayload(card: Card, instruction: string, trace?: Tracer): Promise<Card["payload"]> {
  const schema = PAYLOAD_SCHEMAS[card.kind];
  return chatJSON({
    step: `Revise · ${card.kind}`,
    name: `${card.kind}_payload`,
    schema,
    messages: [
      { role: "system", content: systemPrompt(card) },
      {
        role: "user",
        content: `Rewrite the prepared payload following this instruction: "${instruction}". Keep every field, keep facts accurate, change only what the instruction asks. Return the full payload as JSON.`,
      },
    ],
    mock: () => mockRevision(card, instruction),
    trace,
  }) as Promise<Card["payload"]>;
}
