# Feedforward — Technical spec

Status: v1, 2026-11-04. Deadline: **Nov 4, 9:00 PM ET = Nov 5, 03:00 Paris**.
Guiding rule: ship a demo that works end to end and looks like a real Meta product. Simple > clever.

---

## 1. Verified API facts (tested 2026-11-04 with our key)

Base URL `https://api.meta.ai/v1`, `Authorization: Bearer $META_API_KEY`, OpenAI-SDK compatible.

| Model | Endpoint | Verified | Notes |
|---|---|---|---|
| `muse-spark-1.3` | `POST /chat/completions` | ✅ text, `response_format: json_schema` (strict), tools, `stream: true`, image input (`image_url` data URL) | Reasoning model. ~4 s with `reasoning_effort: "low"`, ~11 s default. Always pass `reasoning_effort`. |
| `muse-image-1.0` | `POST /images/generations` | ✅ `size: "1024x1024"` → `data[0].b64_json` (**webp**, ~1600px) in ~7 s | Edits/compose exist per Meta blog (OpenAI Images shape). |
| `sam-3.1` | `POST /responses` (Responses API) | ✅ ~1.8 s. Input: `input_text` (noun phrase, e.g. "cup") + `input_image` (data URL). `metadata.mask_encoding: "one_bit"` | Output is a special-token string in `output[0].content[0].text`: `<0f>0<\|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..\|><\|mask;x=..;y=..;data=..\|>,1<\|box…`. Parse with npm `@meta-sam/parser` (`decodeMaskToSVGPath`). One concept per request. No match = empty result, not an error. |
| `muse-wonder-1.0` | `POST /chat/completions` | ✅ text | Self-describes as a friendly text assistant. Candidate for the Dive-in chat. |
| `muse-voice-transcribe-1.0` | ❓ `/audio/transcriptions` returns 404 | ❌ endpoint unknown | Stretch only. Check dev.meta.ai docs before using. |
| `muse-spark-1.1/1.2`, `*-contributor` | chat | listed | Not used. |

## 2. Architecture

```
┌──────────── Browser (mobile-first PWA-like UI) ────────────┐
│  Feed (cards) · Card sheet (edit) · Dive-in chat · Camera   │
│  Agent Lens (live trace of model calls)  · Outbox           │
│  State: zustand + localStorage (profile, feed, outbox)      │
└──────────────┬───────────────────────────────▲─────────────┘
               │ fetch / SSE                   │ NDJSON stream of events
┌──────────────▼───────────────────────────────┴─────────────┐
│ Next.js route handlers (stateless; client sends its state)  │
│  /api/feed      Miner → Preparers (parallel) → Ranker       │
│  /api/act       Executor: run the approved action (sandbox) │
│  /api/chat      Dive-in chat (streaming)                    │
│  /api/snap      Photo → Spark vision → SAM 3.1 → cards      │
│  /api/image     Muse Image (card visuals)                   │
└──────────────┬─────────────────────────────────────────────┘
               │ OpenAI SDK (baseURL = Meta)
          Meta Model API: Muse Spark · Muse Image · SAM 3.1 · Muse Wonder
```

**Server is stateless.** The client owns state (taste profile, seen cards, outbox) and sends what's needed with each request. No database, deployable on Vercel as is.

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
  image?: string;             // Muse Image or SAM overlay (data URL)
  action: { label: string; tool: ToolName; args: Record<string, unknown> };
  sponsored?: { brand: string; reason: string };
  score?: number;             // ranker output
  status: "preparing" | "ready" | "approved" | "dismissed" | "done";
}

interface TasteProfile {
  weights: Record<CardKind, number>;   // starts at 1.0
  notes: string[];                     // short natural-language learnings ("Maya ignores newsletters")
  history: { cardId: string; kind: CardKind; verdict: "approve" | "dismiss" | "edit" }[];
}
```

Kind-specific payloads (zod-validated): `email_reply {to, subject, body}`, `team_update {channel, message, metrics:[{label,value,delta}]}`, `schedule {event, conflict, proposed:{start,end}}`, `social_post {caption, imagePrompt}`, `task {steps[]}`, `insight {headline, detail}`, `snap {objects:[{label, box, svgPath}], summary}`, `sponsored {offer, cta}`.

## 5. Pipelines

### 5.1 Feed generation: `POST /api/feed`
Input: `{ profile, seenIds, batch: number }`. Output: an **NDJSON stream** of events:
`{type:"trace", step, model, ms}` · `{type:"skeleton", id, kind}` · `{type:"card", card}` · `{type:"done"}`.

1. **Miner** (Spark, `json_schema`, effort low): persona context + taste notes + seen ids → 6 *opportunities* `{kind, title, why, sourceIds, urgency}`.
2. **Preparers** (Spark, in parallel, one per opportunity, `json_schema` per kind, effort low): produce `payload` + `action`. A card is streamed as soon as it's ready (client shows skeleton → card).
3. **Visuals**: `social_post` (and optionally `insight`) cards trigger Muse Image in the background; the card updates when the image lands.
4. **Ranker**: `score = urgency × weights[kind] × freshness`, computed client-side for instant reorder. Sponsored cards are inserted at position 4 and every ~6 cards, max 1 per batch.
5. **Infinite scroll**: when the user is 2 cards from the end, request the next batch (dedup via `seenIds` + Miner instruction).

### 5.2 Learning: client side + `POST /api/taste`
- Approve: `weights[kind] += 0.15`. Dismiss: `weights[kind] -= 0.25` (floor 0.2). Show a toast: "Tuned: fewer *team updates*".
- Every 3 gestures, `/api/taste` (Spark, effort low) rewrites `profile.notes` (≤5 bullets) from the history. The notes are injected into the Miner prompt, so the next batch is visibly different.

### 5.3 Execution: `POST /api/act`
Approve calls a **sandboxed tool**: `send_email`, `post_message`, `create_event`, `publish_post`, `log_expense`, `create_task`, `open_offer`. Tools are deterministic mocks that return a receipt; the client appends it to the **Outbox** with an animated "Done ✓". Edit opens a bottom sheet to modify the payload before approving.

### 5.4 Dive in: `POST /api/chat`
Streaming chat (Spark, or Wonder if better). The system prompt contains the card, its sources and the persona. Starter chips: "Make it shorter", "More formal", "Why this?". The chat can return an updated payload (tool `update_card`).

### 5.5 Snap: `POST /api/snap`
1. The client uploads an image (camera on mobile, file on desktop); it's downscaled to ≤1280px before sending.
2. Spark vision (`json_schema`): `{scene, objects:[noun phrase ≤4], intents:[{kind,title,why}]}`.
3. SAM 3.1 (parallel, one request per noun phrase) → boxes + masks → SVG paths.
4. Preparers build cards from the intents (same as 5.1). The snap card shows the photo with **animated SAM outlines** drawn over it.

### 5.6 Sponsored
A fictional sponsor catalog (`data/sponsors.json`, invented brands only, never real companies). Spark picks the best match for the persona's current plans and writes `reason` ("You're shipping 40 wholesale orders next week → discounted courier pickup"). Shows a "Sponsored" badge and a "Why am I seeing this?" popover.

## 6. Persona data (`data/persona/`)
Maya, founder of *Ember & Oak Coffee Roasters* (fictional). Sandbox files:
- `profile.json`: name, role, tone of voice, goals this week.
- `inbox.json`: ~15 emails (wholesale client, investor follow-up, supplier invoice, newsletter noise, customer complaint, podcast invite…).
- `calendar.json`: one week of events, with 1–2 conflicts.
- `sales.json`: 14 days of orders by product and channel.
- `notes.md`: product launch ("Ethiopia Guji natural, launching Friday"), todos.
- `sponsors.json`: 6 fictional sponsors.

## 7. UI / UX (this is half the score)

- **Look**: dark-first, near-black background, cards with subtle glass/gradient borders, one accent color, Inter or Geist font, generous radius. Feels like Threads × Instagram × Linear.
- **Layout**: on mobile, a full-width feed with a bottom tab bar (Feed · Snap · Outbox). On desktop, a centered phone-width feed plus an **Agent Lens** panel on the right (live trace: model, step, latency, tokens) and the profile/taste weights on the left.
- **Card anatomy**: header (kind icon, source chips, "why" line) → prepared content (email preview, metric tiles plus sparkline, slot picker, image) → action bar (Approve primary, Edit, Dismiss, Dive in).
- **Gestures**: swipe right to approve, left to dismiss (with buttons as fallback). Haptic-like spring animations.
- **Loading**: never a spinner wall. Skeleton cards with a shimmer and a live label ("Drafting reply…", "Pulling sales…").
- **Empty and error states**: designed, never blank. If an API call fails, the card shows "Couldn't prepare, retry" without breaking the feed.
- **Accessibility**: real buttons, focus states, contrast ≥ 4.5:1, `prefers-reduced-motion`.

## 8. Reliability
- Every model call goes through `lib/meta.ts`: timeout (30 s), 1 retry, zod validation, and a trace event.
- **Mock mode** (`META_MOCK=1`): deterministic fixtures for every endpoint. Used by e2e tests and as a demo safety net.
- The key only lives in `.env` (gitignored) and is read server side only.

## 9. Testing (definition of done)
- **Vitest**: ranker math, taste updates, SAM output parsing, zod schemas.
- **Playwright e2e (mock mode)**: load feed → approve → outbox has the item; dismiss ×2 → weights change, toast shown; snap upload → snap card with outlines; dive in → streamed reply.
- **Live smoke** (`pnpm smoke`): one real call per model (Spark, Image, SAM) must pass.
- **Visual check**: Playwright screenshots at 390×844 and 1440×900 after every UI change, with zero console errors.

## 10. File layout
```
app/
  page.tsx                 # shell: feed + lens + tabs
  api/{feed,act,chat,snap,image,taste}/route.ts
components/                # FeedCard, CardBody/*, ActionBar, AgentLens, SnapSheet, ChatSheet, Outbox, Toast
lib/
  meta.ts                  # client, call wrappers, tracing, mock switch
  schemas.ts               # zod schemas per card kind
  agents/{miner,preparer,taste,snap,sponsor}.ts
  ranker.ts  store.ts  sam.ts  tools.ts
data/persona/*  data/sponsors.json
tests/unit/*  tests/e2e/*
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

## 12. Open questions
- Submission format (video length? public repo? live URL?) — to be confirmed with the user.
- Voice transcription endpoint path.
