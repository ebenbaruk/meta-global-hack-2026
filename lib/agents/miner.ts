import "server-only";
import { chatJSON, type Tracer } from "../meta";
import { personaContext } from "../persona";
import { MinerOutput, type Opportunity } from "../schemas";
import { mockOpportunities } from "../mocks";
import { systemPrompt } from "./prompts";

const BATCH_SIZE = 5;

/** Signal Miner: reads Maya's world and returns the next useful actions. */
export async function mine(opts: {
  notes: string[];
  seenTitles: string[];
  batch: number;
  trace: Tracer;
}): Promise<Opportunity[]> {
  const firstBatch = opts.batch <= 1;
  const user = [
    "CONTEXT (ids in brackets):",
    personaContext(),
    "",
    "PREFERENCES LEARNED FROM HER GESTURES:",
    opts.notes.length ? opts.notes.map((n) => `- ${n}`).join("\n") : "- none yet",
    "",
    "ALREADY IN HER FEED (do not repeat these or near-duplicates):",
    opts.seenTitles.length ? opts.seenTitles.map((t) => `- ${t}`).join("\n") : "- nothing yet",
    "",
    `TASK: find exactly ${BATCH_SIZE} opportunities: actions an agent can fully prepare right now so she only has to tap Approve.`,
    "- Use diverse kinds: email_reply, team_update, schedule, social_post, task, insight. At most 2 of the same kind.",
    firstBatch
      ? "- This is her first batch, exactly one of each: email_reply to the most valuable email, team_update about yesterday's sales, schedule that resolves a real calendar conflict, social_post for the upcoming launch, task for the most urgent decision due today."
      : "- This is a later batch: dig deeper for things not covered yet (other emails worth answering, follow-ups, chores, patterns in the numbers).",
    "- Respect the learned preferences: skip what she dismisses, favour what she approves.",
    "- Skip pure noise (newsletters, promos) unless the preferences say otherwise.",
    '- title: short and human, ≤ 40 chars, starts with a verb, names the person or thing, no ids or order numbers. E.g. "Reply to Lena at Bloom Café", "Make it right with Tom", "Move Daniel\'s coffee chat".',
    "- why: one line ≤ 90 chars saying why it matters now.",
    "- sourceIds: the bracketed ids it is based on, e.g. e3, c5, sales, notes.",
    "- urgency: 3 = today, 2 = this week, 1 = nice to have.",
    "Order by importance.",
  ].join("\n");

  const out = await chatJSON({
    step: "Miner",
    name: "miner_output",
    schema: MinerOutput,
    messages: [
      { role: "system", content: systemPrompt("the Signal Miner") },
      { role: "user", content: user },
    ],
    mock: () => ({ opportunities: mockOpportunities(opts.batch) }),
    trace: opts.trace,
  });

  const seen = new Set(opts.seenTitles.map((t) => t.toLowerCase()));
  return out.opportunities
    .filter((o) => !seen.has(o.title.toLowerCase()))
    .slice(0, BATCH_SIZE)
    .map((o) => ({ ...o, why: o.why.length > 110 ? `${o.why.slice(0, 109).trimEnd()}…` : o.why }));
}
