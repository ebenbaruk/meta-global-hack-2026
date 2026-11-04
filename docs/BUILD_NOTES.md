# Build notes

Obstacles, surprises and API feedback logged while building. These feed the submission survey (drafts in `docs/SUBMISSION.md`). The verified facts are summarized in `docs/SPEC.md` §1.

## Timeline
- 09:50 Paris: scaffold, `lib/meta.ts` wrapper, live smoke green on Spark (json_schema strict), Muse Image, SAM 3.1.
- Then: persona data, card UI, Miner/Preparers/Sponsor/Taste agents with the streaming feed, Snap (Spark vision + SAM 3.1), Dive-in chat with revisions, Agent Lens, outbox and swipe gestures, scanning skeletons.

## Muse Spark 1.3
- Spark latency is driven by hidden reasoning tokens, not the prompt. With `reasoning_effort: "low"` and a ~5k-token prompt, the same call took 9 to 28 s across 6 runs (400 to 2,200 reasoning tokens, at roughly 90 to 100 tokens/s). Strict `json_schema` tended to reason more than `json_object` on the same prompt, but the spread is wide.
- `reasoning_effort: "minimal"` is accepted (allowed values: minimal, low, medium, high, xhigh, max; `none` returns a 400). In our one test it was not faster than `low` (21 s, 1,447 reasoning tokens).
- Running several Spark calls in parallel did not seem to queue them. Each call's latency still varied as much as a single call's.
- The model does not reliably keep calendar slots conflict-free or copy them exactly from a list, so slots are computed and checked in code (business hours plus a 30 min travel buffer). We overwrite the slot only if the model's choice is invalid.
- Revise (`chatJSON` with the kind's payload schema, Spark low): 5.8–6.4 s; "Make it shorter" took the email from 97 to ~60 words, "More formal" switched to "Dear Ms. Ortiz" while keeping every fact.
- Snap vision (Spark, effort low, a 1280 px photo plus the ~16 KB persona context): 10 to 16 s and about 9k tokens. Downscaling the photo to 768 px didn't make it faster (15.6 s), which fits reasoning being the bottleneck. With the context, Spark matched a paper invoice to the supplier's email and to a teammate's low-stock note without being asked. Full `/api/snap` live: snap card at about 18.5 s, both follow-up cards at about 26.7 s.

## Dive-in chat: Spark vs Wonder
- Dive-in chat, Spark vs Wonder (same system prompt with card + sources + persona, 3 questions, streamed through `/api/chat`): `muse-spark-1.3` (effort low) first token in 6.6–9.2 s, done in 7.2–10.3 s. `muse-wonder-1.0` first token in 15–36 s, done in 16–36 s. Both reasoned well on numbers (blended $11.08/lb vs $11.20); Wonder was a bit sharper (it caught a Thursday calendar clash) but 3–4× slower. Picked **Spark** for the demo. Note: with both models the "stream" arrives almost in one burst after the reasoning phase (time to first token ≈ total time), so the UI leans on a typing indicator rather than token-by-token text.

## Muse Image 1.0
- Muse Image latency is ~7–12 s for 1024², which is long for a feed: images must load in the background behind a skeleton.
- Muse Image renders printed text and numbers on an invoice well (header, invoice number, line items, a total that adds up). All 3 tries got the exact figures we asked for.

## SAM 3.1 and `@meta-sam/parser`
- `@meta-sam/parser` needs a `response.output_text.done` event before `response.completed`, even when you feed it a non-streamed response; otherwise it throws `ResponsesStreamLaneError`.
- SAM mask rasters are sized to the object's bounds (not the frame); the SVG path from `decodeMaskToSVGPath` is relative to the mask's top-left, so it has to be offset by `bounds.left/top` to overlay on the photo.
- SAM SVG paths are pixel staircases (~37 KB for one large object). Fine for a card, but heavy if you have many objects.
- SAM 3.1 finds plain visual categories but not roles or document types. On our invoice photo, "invoice", "receipt" and "coffee sack" returned nothing (an empty result, not an error), while "paper" and "document" outlined the invoice and "sack", "bag" and "burlap sack" all outlined the sack. So the Snap vision step returns two things per object: a `phrase` for SAM ("paper") and a `label` to show ("Invoice").
- SAM returns every instance of a concept: "coffee beans" gave 29 to 33 separate beans, "coffee bag" on the shelf photo gave 16 bags. The instances don't come sorted by size, so we sort by box area and keep 12 per phrase.
- SAM 3.1 took 1.1 to 3.0 s per phrase, and parallel calls didn't slow each other down. The raw one-bit output is small (300 B to 4 KB per phrase) even though the SVG path it decodes to is 30 KB or more, so we record the raw text as fixtures for mock mode.
- The request shape (Responses API, `input_text` + `input_image`, `metadata.mask_encoding: "one_bit"`) and the special-token output format had to be worked out by trial; we found no reference documentation for them.

## Muse Voice Transcribe
- `muse-voice-transcribe-1.0` is listed, but `POST /audio/transcriptions` returns 404 and we found no documented path. Voice was cut from scope.

## End-to-end pipeline
- Live feed, batch 1 (Miner, then 5 Preparers in parallel, plus the Sponsor match, then Muse Image): Miner 12 to 14 s, Preparers 7 to 15 s each, Sponsor 11 to 12 s, Muse Image 8 to 15 s. First card about 21 s after the request, all cards about 28 s, image about 34 to 44 s. Since each step waits on the one before it, the feed has to show progress the whole time (skeletons, Agent Lens).

## Design decisions these notes drove
- **Skeletons from the first millisecond**: five "scanning" skeletons go out before the Miner answers, then get renamed to what it found, and unused ones are dropped (`drop` event).
- **The sponsor match runs in parallel with the Miner**, so it is ready by the 3rd card instead of adding 11 s at the end.
- **Images never block a card**: the card is usable immediately, and the image (or an `image_error` with a retry) arrives later.
- **Exact values come from code**: sales metrics and sparklines are computed, calendar slots are checked; the model writes the words.
- **SAM gets plain nouns**: the vision prompt asks for a SAM `phrase` and a display `label` for each object.
- **Spark for chat**, with a typing indicator instead of token-by-token text.
- **Mock mode from recorded outputs**: raw SAM text is small, so real masks back the e2e tests and the demo fallback.
