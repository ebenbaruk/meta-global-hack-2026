import "server-only";
import { z } from "zod";
import { chatJSON, type Tracer } from "../meta";
import { mockTasteNotes } from "../mocks";
import type { TasteProfile } from "../schemas";
import { systemPrompt } from "./prompts";

export type TasteHistory = TasteProfile["history"];

/** Taste memory: turns her gestures into ≤ 5 short preference notes for the Miner. */
export async function learnTaste(opts: { history: TasteHistory; trace: Tracer }): Promise<string[]> {
  const lines = opts.history.slice(-30).map((h) => `- ${h.verdict.toUpperCase()} · ${h.kind} · "${h.title}"`);
  const out = await chatJSON({
    step: "Taste memory",
    name: "taste_notes",
    schema: z.object({ notes: z.array(z.string()) }),
    messages: [
      { role: "system", content: systemPrompt("the Taste memory") },
      {
        role: "user",
        content: [
          "Her recent gestures on feed cards (oldest first):",
          ...lines,
          "",
          "Write at most 5 short preference notes (≤ 50 chars each) that a feed ranker can act on,",
          'e.g. "Skips newsletters and promos", "Approves wholesale replies fast". Only state patterns the gestures support.',
        ].join("\n"),
      },
    ],
    mock: () => ({ notes: mockTasteNotes(opts.history) }),
    trace: opts.trace,
  });
  return out.notes.map((n) => n.trim()).filter(Boolean).slice(0, 5);
}
