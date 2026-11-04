# Feedforward — Technical spec

Status: v2, 2026-11-04 (updated to match the build). Deadline: **Nov 4, 9:00 PM ET = Nov 5, 03:00 Paris**.
Guiding rule: ship a demo that works end to end and looks like a real Meta product. Simple > clever.

---

## 1. Verified API facts (tested 2026-11-04 with our key)

Base URL `https://api.meta.ai/v1`, `Authorization: Bearer $META_API_KEY`, OpenAI-SDK compatible.

| Model | Endpoint | Verified | Notes |
|---|---|---|---|
| `muse-spark-1.3` | `POST /chat/completions` | ✅ text, `response_format: json_schema` (strict), tools (verified, not used in the app), `stream: true`, image input (`image_url` data URL) | Reasoning model. Always pass `reasoning_effort` (we use `"low"`). See latency facts below. |
| `muse-image-1.0` | `POST /images/generations` | ✅ `size: "1024x1024"` → `data[0].b64_json` (**webp**, ~1600px) in 7–15 s | Renders printed text and numbers accurately (invoice header, line items, a total that adds up: 3/3 tries exact). |
| `sam-3.1` | `POST /responses` (Responses API) | ✅ 1.1–3.0 s per phrase. Input: `input_text` (one noun phrase) + `input_image` (data URL). `metadata.mask_encoding: "one_bit"` | Output is a special-token string in `output_text`: `<0f>0<\|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..\|><\|mask;x=..;y=..;data=..\|>,1<\|box…`. Parse with npm `@meta-sam/parser`. One concept per request. No match = empty result, not an error. |
| `muse-wonder-1.0` | `POST /chat/completions` | ✅ text, streaming | Evaluated for Dive-in chat, **not used**: 3–4× slower than Spark (see below). |
| `muse-voice-transcribe-1.0` | ❓ `/audio/transcriptions` returns 404 | ❌ endpoint not found | Not used. |
| `muse-spark-1.1/1.2`, `*-contributor` | chat | listed | Not used. |

### Facts learned while building (details and raw numbers in `docs/BUILD_NOTES.md`)

**Muse Spark**
- Latency comes from hidden reasoning tokens, not prompt size. At `reasoning_effort: "low"` a typical call takes **6–14 s**. With a ~5k-token prompt, the same call took 9–28 s across 6 runs (400–2,200 reasoning tokens at roughly 90–100 tokens/s).
- `reasoning_effort` accepts `minimal | low | medium | high | xhigh | max`. `minimal` is accepted but was **not faster** than `low` in our test. `none` returns a **400**.
- Parallel calls don't seem to queue: 5 Preparers in parallel each take about as long as one call.
- Streaming arrives almost in one burst after the reasoning phase (time to first token ≈ total time), so the chat UI uses a typing indicator.
- Strict `json_schema` works reliably with schemas generated from zod (`additionalProperties: false`, every property required).
- Vision with a 1280 px photo plus the ~16 KB persona context (~9k tokens in total): 10–16 s. Downscaling to 768 px did not make it faster.
- The model doesn't reliably keep calendar slots conflict-free, so slots are computed and checked in code (see 5.1).

**Muse Wonder vs Spark for chat** (same prompt, 3 questions): Spark first token 6.6–9.2 s, Wonder 15–36 s. Wonder was slightly sharper but 3–4× slower → the chat uses **Spark**.

**SAM 3.1**
- Finds **plain visual categories, not roles or document types**: on the invoice photo, "invoice", "receipt" and "coffee sack" returned nothing, while "paper"/"document" outlined the invoice and "sack"/"bag"/"burlap sack" outlined the sack. So vision returns a `phrase` for SAM plus a display `label`.
- Returns **every instance** of the concept ("coffee beans" → 29–33 beans, "coffee bag" → 16 bags), not sorted by size. We sort by box area and keep 12 per phrase.
- `@meta-sam/parser` requires a `response.output_text.done` event before `response.completed`, even for a non-streamed response, or it throws `ResponsesStreamLaneError`. `lib/sam.ts` feeds it delta + done + completed.
- The mask raster has the **size of the object's bounds**, not the frame: the SVG path from `decodeMaskToSVGPath` must be scaled to the bounds and offset by `bounds.left/top` to overlay on the photo.
- SVG paths are pixel staircases (~37 KB for a large object), but the raw one-bit output is small (300 B–4 KB), so raw text is what we record as mock fixtures.

**End-to-end live timings** (batch 1): Miner 12–14 s, Preparers 7–15 s each, Sponsor 11–12 s, Muse Image 8–15 s. First card ≈ 21 s, all cards ≈ 28 s, image ≈ 34–44 s. Snap: snap card ≈ 18.5 s, follow-ups ≈ 26.7 s.

## 2. Architecture

```
┌──────────── Browser (mobile-first PWA-like UI) ────────────┐
│  Feed (cards) · Edit sheet · Dive-in chat · Snap · Outbox   │
│  Agent Lens (live trace) · Taste panel (weights + notes)    │
│  State: zustand + localStorage (profile, feed, outbox)      │
└──────────────┬───────────────────────────────▲─────────────┘
               │ fetch (POST)                  │ NDJSON stream / text stream
┌──────────────▼───────────────────────────────┴─────────────┐
│ Next.js route handlers (stateless; client sends its state)  │
│  /api/feed      Miner → Preparers ×5 (parallel) → Image     │
│  /api/act       Executor: run the approved action (sandbox) │
│  /api/chat      Dive-in chat (streamed text, Spark)         │
│  /api/revise    Rewrite a payload from one instruction      │
│  /api/taste     Gestures → ≤ 5 taste notes                  │
│  /api/snap      Photo → Spark vision → SAM 3.1 → cards      │
│  /api/image     Muse Image retry                            │
└──────────────┬─────────────────────────────────────────────┘
               │ OpenAI SDK (baseURL = Meta)
          Meta Model API: Muse Spark · Muse Image · SAM 3.1
```

**Server is stateless.** The client owns state (taste profile, seen cards, outbox) and sends what's needed with each request. No database. Ranking runs on the client.

## 3. Stack

- **Next.js 15 (App Router) + TypeScript + React 19**, a single app at the repo root.
- **Tailwind CSS v4** + **Framer Motion** (card enter, swipe gestures, layout animations) + **lucide-react** icons.
- **zustand** (with `persist`) for client state.
- **openai** npm SDK pointed at Meta (`baseURL`), **zod** for schemas (→ JSON schema for `response_format`).
- **@meta-sam/parser** for SAM output.
- Tests: **Vitest** (pure logic) + **Playwright** (e2e, against mock mode and a live smoke run).
- Package manager: **pnpm**. Dev port **3100** (`http://surface:3100`).

## 4. Domain model

```ts
type CardKind =
  | "email_reply" | "team_update" | "schedule" | "social_post"
  | "task" | "insight" | "snap" | "sponsored";

interface Card {
  id: string;
  kind: CardKind;
  title: string;              // "Reply to Lena at Bloom Café"
  why: string;                // one line: why this is in your feed now
  source: SourceRef[];        // which emails/events/rows it came from (shown as chips)
  urgency: 1 | 2 | 3;
  payload: CardPayload;       // kind-specific prepared work (draft, chart data, slot…)
  image?: string;             // Muse Image webp or the snapped photo (data URL)
  imageStatus?: "loading" | "ready" | "error";
  actionLabel: string;        // "Send reply"; the tool comes from TOOL_BY_KIND[kind]
  sponsored?: { brand: string; reason: string };
  createdAt: number;          // used for freshness
  status: "preparing" | "ready" | "approved" | "dismissed" | "done" | "error";
}

interface TasteProfile {
  weights: Record<CardKind, number>;   // starts at 1.0
  notes: string[];                     // short natural-language learnings ("Maya ignores newsletters")
  history: { cardId: string; kind: CardKind; title: string; verdict: "approve" | "dismiss" | "edit" }[];
}
```

Kind-specific payloads (zod-validated, `lib/schemas.ts`): `email_reply {to, subject, body}`, `team_update {channel, message, metrics:[{label,value,delta}], series:number[]}`, `schedule {event, conflict, proposed:{start,end}, message}`, `social_post {platform, caption, imagePrompt, hashtags[]}`, `task {steps[]}`, `insight {headline, detail, stat}`, `snap {summary, width, height, objects:[{label, box, svgPath}], lines:[{label, amount}]}`, `sponsored {offer, cta}`. Card placeholders (skeletons) are a separate `Placeholder {id, kind, label, status}` type in `lib/ranker.ts`.

## 5. Pipelines

### 5.1 Feed generation: `POST /api/feed`
Input: `{ notes, seenTitles, batch }` (taste notes, titles already in the feed, batch number). Output: an **NDJSON stream** of `FeedEvent`s:
`{type:"trace", trace}` · `{type:"skeleton", id, kind, label}` (a repeated id renames it) · `{type:"drop", id}` (placeholder not needed) · `{type:"card", card}` · `{type:"image", id, image}` · `{type:"image_error", id, message}` (card stays usable, retry via `/api/image`) · `{type:"card_error", id, message}` · `{type:"prepared", at}` (overnight replay, see 5.1b) · `{type:"done"}`.

1. **Scanning skeletons**: 5 skeletons go out immediately with generic live labels ("Reading your inbox…", "Pulling 14 days of sales…") while the Miner reads.
2. **Miner** (Spark, `json_schema`, effort low): persona context + taste notes + seen titles → **5** opportunities `{kind, title, why, sourceIds, urgency}`. Batch 1 is exactly one each of email_reply, team_update, schedule, social_post, task; later batches dig deeper. Skeletons are renamed to what was found ("Drafting reply to Lena…"), and unused ones are dropped.
3. **Preparers** (Spark, in parallel, one per opportunity, `json_schema` per kind, effort low): produce `payload` + `actionLabel`. A card streams as soon as it's ready. Values that must be exact come from code: `team_update` metrics and series are computed from `sales.json`; `schedule` gets a list of free slots (business hours, 30 min travel buffer) and the proposal is replaced by the first free slot if the model picks a busy one.
4. **Visuals**: `social_post` cards trigger Muse Image in the background; an `image` (or `image_error`) event follows.
5. **Sponsor**: the sponsor match starts in parallel with the Miner and is sent right after the 3rd card (or at the end if fewer cards made it). One per batch.
6. **Ranker** (client, `lib/ranker.ts`): `score = urgency × weights[kind] × freshness` (freshness halves every 6 h, floor 0.5). Placeholders keep their slot, snap cards are pinned on top, sponsored cards go at position 4 then every 6 cards. Acted cards leave the feed.
7. **Infinite scroll**: an IntersectionObserver near the end loads the next batch, up to 4 automatic batches (then a designed caught-up state). Dedup through `seenTitles` in the Miner prompt plus an exact-title filter.

### 5.1b Overnight run (`lib/overnight.ts`, `lib/pipeline.ts`)
The morning feed (`batch 1`, no notes, no seen titles, live mode) is served from a saved real run: `pnpm overnight` (or the first live visit) runs `runFeed`, and a clean run (no `card_error`/`image_error`, ≥3 cards) is saved to `.cache/overnight.json` (24 h TTL, in memory after first read). A replay sends `{type:"prepared", at}` first, then the recorded traces, cards (140 ms apart) and images with fresh ids; skeletons and drops are not replayed. The client shows "Ready since …, prepared ahead". Mock mode always runs the pipeline.

### 5.2 Learning: client side + `POST /api/taste`
- Approve: `weights[kind] += 0.15`. Edit: `+0.05`. Dismiss: `weights[kind] -= 0.25`. Clamped to [0.2, 2.5]. A toast says "Tuned: fewer *team updates*" (`lib/taste.ts`).
- Every 3 gestures, `/api/taste` (Spark, effort low) rewrites `profile.notes` (≤5 bullets) from the history. The notes are injected into the Miner prompt, so the next batch is visibly different.

### 5.3 Execution: `POST /api/act`
Approve calls a **sandboxed tool** chosen by card kind (`TOOL_BY_KIND`): `send_email`, `post_message`, `create_event`, `publish_post`, `create_task` (task and insight), `log_expense` (snap), `open_offer` (sponsored). Tools are deterministic mocks (300–600 ms) that return a human receipt; the client applies the approve optimistically and appends the receipt to the **Outbox**. Edit opens a bottom sheet with a per-kind payload editor before approving.

### 5.4 Dive in: `POST /api/chat` and `POST /api/revise`
- `/api/chat`: streamed plain-text reply from **Spark** (effort low; Wonder was evaluated and rejected for latency, see §1). The system prompt contains the card, the full text of its source documents and the persona context. Starter chips: "Why this?", "Make it shorter", "More formal", "What if I say no?".
- `/api/revise`: `{card, instruction}` → a new payload, via `chatJSON` with the kind's payload schema (5.8–6.4 s live). "Make it shorter" and "More formal" use it; the chat shows a preview and the user applies it to the card in one tap.

### 5.5 Snap: `POST /api/snap`
1. The client uploads an image (camera on mobile, file on desktop); it's downscaled to ≤1280px before sending.
2. Spark vision (`json_schema`, with the persona context): `{scene, title, actionLabel, summary, objects:[{phrase, label}] (2–4), lines:[{label, amount}], intents:[{kind, title, why, sourceIds}] (2)}`. `phrase` is a plain visual noun for SAM ("paper", "sack"), `label` is what the user sees ("Invoice"). The skeleton label updates per stage ("SAM 3.1 is outlining invoice, green coffee sack…").
3. SAM 3.1 (parallel, one request per phrase) → boxes + masks → SVG paths in image pixels, largest 12 instances per phrase. A failed phrase returns no outlines but never sinks the card.
4. The snap card goes out (pinned on top, action `log_expense`), then Preparers build the 2 follow-up cards from the intents (same as 5.1). The snap card shows the photo with **animated SAM outlines**. Two demo photos ship in `public/demo/` (supplier invoice, stock shelf); in mock mode the invoice is always used so the recorded outlines line up.

### 5.6 Sponsored
A fictional sponsor catalog (`data/sponsors.json`, 6 invented brands, never real companies). Spark picks the best match among the brands not yet shown (rotation via `seenTitles`) for the persona's goals, notes and calendar, and writes `reason` (≤ 110 chars) ("You're shipping 40 wholesale orders next week → discounted courier pickup"). Shows a "Sponsored" badge and a "Why am I seeing this?" popover.

## 6. Persona data (`data/persona/`)
Maya, founder of *Ember & Oak Coffee Roasters* (fictional). Sandbox files:
- `profile.json`: name, role, tone of voice, goals this week.
- `inbox.json`: 15 emails (wholesale client, investor follow-up, supplier invoice, newsletter noise, customer complaint, podcast invite…).
- `calendar.json`: one week of events, with 1–2 conflicts.
- `sales.json`: 14 days of orders by product and channel.
- `notes.md`: product launch ("Ethiopia Guji natural, launching Friday"), todos.
- `data/sponsors.json`: 6 fictional sponsors (PickupPilot, Kraftfold, Ledgerleaf, TapStall, Lumen & Lens Studio, Roastwell Service Co.).

## 7. UI / UX (this is half the score)

- **Look**: dark-first, near-black background, cards with subtle glass/gradient borders, one accent color, Inter or Geist font, generous radius. Feels like Threads × Instagram × Linear.
- **Layout**: on mobile, a full-width feed with a bottom tab bar (Feed · Snap · Outbox). On desktop, a centered phone-width feed plus an **Agent Lens** panel on the right (live trace: model, step, latency, tokens) and the profile/taste weights on the left.
- **Card anatomy**: header (kind icon, source chips, "why" line) → prepared content (email preview, metric tiles plus sparkline, slot picker, image) → action bar (Approve primary, Edit, Dismiss, Dive in).
- **Gestures**: swipe right to approve, left to dismiss (with buttons as fallback). Haptic-like spring animations.
- **Loading**: never a spinner wall. Skeleton cards with a shimmer and a live label ("Drafting reply…", "Pulling sales…").
- **Empty and error states**: designed, never blank. If an API call fails, the card shows "Couldn't prepare, retry" without breaking the feed.
- **Accessibility**: real buttons, focus states, contrast ≥ 4.5:1, `prefers-reduced-motion`.

## 8. Reliability
- Every model call goes through `lib/meta.ts`: timeout (30 s), 1 retry, zod validation, and a trace event (`ok | error | mock`).
- Failures are local: a failed Preparer becomes a retryable error card, a failed image keeps the card usable, a failed SAM phrase just has no outline.
- Client state persists in `localStorage`; if images exceed the quota, it saves without them.
- **Mock mode** (`META_MOCK=1`): deterministic fixtures for every endpoint (SAM fixtures are recorded raw outputs in `tests/fixtures/`). Used by e2e tests and as a demo safety net.
- The key only lives in `.env` (gitignored) and is read server side only.

## 9. Testing (definition of done)
- **Vitest**: ranker math, taste updates, SAM output parsing (on recorded fixtures), zod → strict JSON schema.
- **Playwright e2e (mock mode, `tests/e2e/feed.spec.ts`)**: feed materializes with several kinds; approve → outbox has the item; dismiss ×2 → weights change, toast shown; sponsored card explains itself; dive in → streamed reply; snap a demo photo → snap card with outlines.
- **Live smoke** (`pnpm smoke`): one real call per model (Spark, Image, SAM) must pass.
- **Visual check**: Playwright screenshots at 390×844 and 1440×900 after every UI change, with zero console errors.

## 10. File layout
```
app/
  page.tsx                 # shell: feed + lens + tabs
  api/{feed,act,chat,revise,snap,image,taste}/route.ts
components/                # Feed, FeedCard, ActionBar, SkeletonCard, AgentLens, TastePanel, SnapSheet, ChatSheet, EditSheet, Outbox, WhyPopover, Toast
  cards/                   # one body per kind + CardEditor
lib/
  meta.ts                  # client, call wrappers, tracing, mock switch
  schemas.ts               # zod schemas per card kind
  agents/{miner,preparer,sponsor,taste,snap,chat,prompts}.ts
  ranker.ts  taste.ts  store.ts  sam.ts  tools.ts  ndjson.ts  persona.ts  mocks.ts
data/persona/*  data/sponsors.json  public/demo/*
tests/unit/*  tests/e2e/*  tests/fixtures/*  scripts/smoke.ts
```

## 11. Build order and timeline (Paris time)
| Time | Milestone |
|---|---|
| 10:00–11:00 | Scaffold, `lib/meta.ts`, persona data, smoke test green |
| 11:00–14:00 | Miner + Preparers + `/api/feed` streaming, card UI for 4 kinds |
| 14:00–16:30 | Approve/Edit/Dismiss, Outbox, taste learning + toast, ranker |
| 16:30–19:00 | Muse Image visuals, Snap (vision + SAM outlines), Sponsored |
| 19:00–20:30 | Dive-in chat, Agent Lens |
| 20:30–23:00 | UI polish, e2e green, deploy (Vercel) |
| 23:00–02:00 | Demo video, README, submission |
| 02:00–03:00 | Buffer |

**Cut order if late**: Dive-in edits via tool → taste notes rewrite → infinite scroll → Wonder → voice. Never cut: live feed, approve flow, Muse Image, SAM snap, polish.

## 12. Open questions (resolved)
- ~~Submission format~~: 3-minute video (YouTube), public GitHub repo; see `docs/SUBMISSION.md`.
- ~~Voice transcription endpoint path~~: not found (`/audio/transcriptions` → 404). Voice was cut.
- ~~Spark or Wonder for chat~~: Spark (latency, §1).
- ~~Deploy~~: not required for submission; the demo runs from the dev server, with mock mode as a fallback.
