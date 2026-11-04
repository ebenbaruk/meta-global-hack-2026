# Submission — Meta Global AI Developer Hackathon 2026

**Due: Nov 4, 9:00 PM ET = Nov 5, 03:00 Paris.** Submit by 01:30 Paris at the latest and keep the rest as buffer.

## Form fields (✱ = required) and our drafts

| Field | Answer / plan |
|---|---|
| ✱ Team name | Feedforward |
| Team members | Eli Benbaruk (ebenbaruk) |
| ✱ Track | **Indie developer track** |
| ✱ Problem statement | **Build for Your World** (bring Meta's models into a domain you know firsthand) |
| Most Viral Track (X post link) | Optional: post the demo video on X with a strong hook ("Stop prompting. Start scrolling.") and paste the link |
| ✱ Project description | Draft below |
| ✱ Public GitHub repo | https://github.com/ebenbaruk/meta-global-hack-2026 → **switch to public before submitting** (`gh repo edit --visibility public --accept-visibility-change-consequences`) after a final audit (no secrets, no `.env`) |
| ✱ 3-minute demo video | YouTube link (unlisted is fine). See the video plan below |
| ✱ Use of Meta products | Draft below |
| ✱ Why Meta's models matter | Draft below |
| Partner tech feedback | Not used (we went direct to the Meta Model API). Leave empty or say so |
| ✱ Likelihood to build with Meta Model API / overall opinion | Eli to choose |
| Survey questions (recommend API, Muse Code, obstacles, comparison, priorities, switching, production blockers) | Drafts in **Survey answers** below |

### Project description (draft, ~140 words)
Feedforward turns AI agents into a feed. Chat asks people for labor: figure out what AI can do, explain the task, paste the context, repeat. But billions of people already know how to scroll. In Feedforward, every card is work an agent has already done: the email to answer, drafted in your voice; yesterday's sales, with the team update ready to post; a calendar clash, already moved to a free slot; the launch post, with its visual rendered by Muse Image. Approve, edit, dismiss, or dive into a chat that already knows the context. Every gesture retunes the ranking live, and a taste memory steers what the agents look for next. Snap a supplier invoice and SAM 3.1 outlines it while new cards appear. Clearly labeled sponsored actions, matched to your plans, show how a feed of useful work pays for itself. Stop prompting. Start scrolling.

### Use of Meta products (draft)
Every model call in Feedforward goes to the Meta Model API, through one OpenAI-compatible wrapper:
- **Muse Spark 1.3** runs the whole agent pipeline with strict JSON-schema output: a Signal Miner finds 5 action opportunities in the user's inbox, calendar, sales and notes; parallel Preparers do the work behind each card with a schema per card kind; a Sponsor matcher picks the relevant fictional offer and explains why; a Taste memory turns gestures into preference notes that steer the next batch; and the Dive-in chat streams context-aware answers and rewrites drafts on request.
- **Muse Spark vision + SAM 3.1** power Snap: Spark reads the photo against the user's context (it matched an invoice to the supplier's email unprompted) and names the objects; SAM 3.1, via the Responses API and `@meta-sam/parser`, outlines them with pixel masks animated on the card.
- **Muse Image 1.0** renders the launch-post visuals in the background.
- **Muse Wonder** was benchmarked for chat; Spark won on latency.

### Why Meta's models matter (draft)
The feed is Meta's native form factor, and Feedforward shows what it becomes when agents fill it. A feed of actions needs the whole loop from one model family: structured reasoning reliable enough to prepare real work unattended (Muse Spark with strict JSON schemas, every output validated), vision plus pixel-accurate segmentation to turn the physical world into cards (Spark + SAM 3.1), and image generation for the visual language of a feed (Muse Image, which even renders exact numbers). Getting all of it behind one OpenAI-compatible API kept the architecture simple enough to build in a day. And the business model is Meta's own: sponsored actions that are relevant because they match your plans, not your clicks.

## Survey answers (draft, from `docs/BUILD_NOTES.md`)

**Likelihood to build with the Meta Model API / overall opinion** — *Eli to pick.* Suggested default: **4 / 5**, "Positive: the model range and the OpenAI compatibility are excellent; latency is what holds it back for consumer products."

**Would you recommend the Meta Model API?**
Yes, with a caveat on latency. It's OpenAI-compatible, so we used the standard `openai` SDK by changing `baseURL`, and strict `json_schema` output from Muse Spark worked for every agent in the pipeline. It's also the only API where one key gave us reasoning, vision, image generation and segmentation. The caveat: Spark is a reasoning model, and at 6–14 s per call it's hard to build anything that should feel instant.

**Biggest obstacles**
- **Reasoning latency.** Spark took 6–14 s per call even at `reasoning_effort: "low"`, sometimes up to 28 s, depending on how many hidden reasoning tokens it used. `minimal` is accepted but wasn't faster, and `none` returns a 400. A feed batch showed its first card after about 21 s, so we built the whole UI around skeletons and live progress.
- **Streaming doesn't help much.** Streamed replies arrive almost all at once after the reasoning phase, so time to first token is about the same as total time.
- **SAM 3.1 docs are sparse.** We had to discover the Responses API request shape, the `one_bit` mask encoding and the special-token output format by trial. `@meta-sam/parser` also requires an `output_text.done` event even for non-streamed responses, and mask rasters are sized to the object's bounds, not the frame. Neither is documented.
- **SAM's noun-phrase constraint.** SAM finds visual categories ("paper", "sack") but not roles ("invoice", "receipt", "coffee sack" returned nothing), and it returns every instance (30 coffee beans) in no particular order. We added a translation step in the vision prompt and sorted results by area ourselves.
- **Voice endpoint not found.** `muse-voice-transcribe-1.0` is listed, but `/audio/transcriptions` returns 404 and we couldn't find the right path, so we cut voice.

**Comparison with other APIs**
Integration was as easy as any OpenAI-compatible provider: the same SDK, the same structured-output and streaming shapes, zero glue code for Spark and Muse Image. Image text rendering was excellent (exact invoice figures every time). Where it falls behind is latency: we had no fast, non-reasoning tier for the many small structured calls an agent pipeline makes.

**What Meta should prioritize**
1. A low-latency, non-reasoning mode (or a `reasoning_effort: "none"` that really skips reasoning) for structured and agentic calls.
2. Faster reasoning, or streamed reasoning progress, so apps can show that something is happening.
3. SAM 3.1 documentation for the Responses API: request shape, output token format, mask coordinate space, and full parser examples.
4. Multi-concept SAM requests (several noun phrases in one call), and an option to rank or cap instances.
5. Documented endpoints for every listed model (voice transcription).

**Would you switch / production blockers**
For production, the blocker is latency: an interactive consumer feed needs preparation calls in 1–3 s, not 10–20 s. Pre-computing cards in the background mostly hides it for a feed, but not for chat. Second, the missing SAM and voice documentation makes those models risky to depend on. If a fast tier existed, we'd happily keep the whole stack on Meta: having one provider for reasoning, vision, segmentation and images is a real simplification.

**Partner tech feedback** — Not used: we called the Meta Model API directly.

## Demo video plan (produced by the engineer, not by Eli)
Target **2:45–3:00**, 1080p, uploaded to YouTube.
- **Capture**: Playwright (Chromium headless, `recordVideo`) drives the real app against the live API through a scripted run (`scripts/demo.ts`). Record mobile (390×844) and desktop (1440×900, with Agent Lens) passes. Add short waits so the viewer can read each card.
- **Voiceover**: English narration script in `video/script.md`, synthesized with `uvx edge-tts` (a natural neural voice, e.g. `en-US-AndrewNeural`), one clip per scene.
- **Edit**: ffmpeg (available on the machine). Title card → problem (chat = labor) → scenes → architecture slide (Meta models) → closing line. Text overlays via `drawtext` or pre-rendered HTML slides screenshotted by Playwright. Light music optional.
- **Structure**: 0:00 hook "Stop prompting. Start scrolling." · 0:15 the problem · 0:35 live demo (feed materializes, approve, dismiss → retune, Muse Image post, Snap + SAM, sponsored, dive in) · 2:20 under the hood (three Meta models in production, Wonder benchmarked, Agent Lens) · 2:45 closing.
- Output: `video/out/feedforward-demo.mp4` (gitignored).
