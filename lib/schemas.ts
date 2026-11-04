import { z } from "zod";

/** Single source of truth for the domain. Every model output is parsed with one of these. */

export const CARD_KINDS = [
  "email_reply",
  "team_update",
  "schedule",
  "social_post",
  "task",
  "insight",
  "snap",
  "sponsored",
] as const;
export const CardKind = z.enum(CARD_KINDS);
export type CardKind = z.infer<typeof CardKind>;

export const TOOL_BY_KIND = {
  email_reply: "send_email",
  team_update: "post_message",
  schedule: "create_event",
  social_post: "publish_post",
  task: "create_task",
  insight: "create_task",
  snap: "log_expense",
  sponsored: "open_offer",
} as const satisfies Record<CardKind, string>;
export type ToolName = (typeof TOOL_BY_KIND)[CardKind];

export const SourceRef = z.object({
  id: z.string(),
  type: z.enum(["email", "event", "sales", "note", "photo", "sponsor"]),
  label: z.string(),
});
export type SourceRef = z.infer<typeof SourceRef>;

// ---------- Kind-specific payloads (what the Preparer produces) ----------

export const EmailReplyPayload = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
});
export const Metric = z.object({ label: z.string(), value: z.string(), delta: z.string() });
export const TeamUpdatePayload = z.object({
  channel: z.string(),
  message: z.string(),
  metrics: z.array(Metric),
  series: z.array(z.number()), // sparkline, oldest → newest
});
export const SchedulePayload = z.object({
  event: z.string(),
  conflict: z.string(),
  proposed: z.object({ start: z.string(), end: z.string() }), // ISO local datetimes
  message: z.string(), // note sent to the other party
});
export const SocialPostPayload = z.object({
  platform: z.enum(["instagram", "threads", "facebook"]),
  caption: z.string(),
  imagePrompt: z.string(),
  hashtags: z.array(z.string()),
});
export const TaskPayload = z.object({ steps: z.array(z.string()) });
export const InsightPayload = z.object({
  headline: z.string(),
  detail: z.string(),
  stat: z.string(), // big number shown on the card, e.g. "+38%"
});
export const SnapObject = z.object({
  label: z.string(),
  box: z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }),
  svgPath: z.string(), // in image pixel coordinates
});
export const SnapPayload = z.object({
  summary: z.string(),
  width: z.number(),
  height: z.number(),
  objects: z.array(SnapObject),
  lines: z.array(z.object({ label: z.string(), amount: z.string() })),
});
export const SponsoredPayload = z.object({ offer: z.string(), cta: z.string() });

export const PAYLOAD_SCHEMAS = {
  email_reply: EmailReplyPayload,
  team_update: TeamUpdatePayload,
  schedule: SchedulePayload,
  social_post: SocialPostPayload,
  task: TaskPayload,
  insight: InsightPayload,
  snap: SnapPayload,
  sponsored: SponsoredPayload,
} as const;

export type PayloadOf<K extends CardKind> = z.infer<(typeof PAYLOAD_SCHEMAS)[K]>;

// ---------- Card ----------

export type CardStatus = "preparing" | "ready" | "approved" | "dismissed" | "done" | "error";

interface CardBase<K extends CardKind> {
  id: string;
  kind: K;
  title: string;
  why: string;
  source: SourceRef[];
  urgency: 1 | 2 | 3;
  payload: PayloadOf<K>;
  image?: string; // data URL (Muse Image webp, or the snapped photo)
  imageStatus?: "loading" | "ready" | "error";
  actionLabel: string; // "Send reply", "Post to #team"…
  sponsored?: { brand: string; reason: string };
  createdAt: number;
  status: CardStatus;
}
export type Card = { [K in CardKind]: CardBase<K> }[CardKind];

// ---------- Miner output ----------

export const Opportunity = z.object({
  kind: CardKind.exclude(["snap", "sponsored"]),
  title: z.string(),
  why: z.string(),
  sourceIds: z.array(z.string()),
  urgency: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type Opportunity = z.infer<typeof Opportunity>;
export const MinerOutput = z.object({ opportunities: z.array(Opportunity) });

// ---------- Taste ----------

export type Verdict = "approve" | "dismiss" | "edit";
export interface TasteProfile {
  weights: Record<CardKind, number>;
  notes: string[];
  history: { cardId: string; kind: CardKind; title: string; verdict: Verdict }[];
}

// ---------- Agent Lens trace ----------

export interface TraceEvent {
  id: string;
  step: string; // "Miner", "Preparer · email_reply", "SAM 3.1 · invoice"…
  model: string;
  ms: number;
  status: "ok" | "error" | "mock";
  tokens?: number;
  detail?: string;
  at: number;
}

// ---------- /api/feed NDJSON stream ----------

export type FeedEvent =
  | { type: "trace"; trace: TraceEvent }
  | { type: "skeleton"; id: string; kind: CardKind; label: string }
  | { type: "card"; card: Card }
  | { type: "image"; id: string; image: string }
  | { type: "image_error"; id: string; message: string } // card stays usable, retry via /api/image
  | { type: "card_error"; id: string; message: string }
  | { type: "done" };

// ---------- Executor ----------

export interface Receipt {
  id: string;
  cardId: string;
  kind: CardKind;
  tool: ToolName;
  title: string; // "Reply sent to Lena Ortiz"
  detail: string; // one line, e.g. subject or channel
  at: number;
}

// ---------- Persona sandbox data (data/persona/*) ----------

export interface Persona {
  profile: {
    name: string;
    company: string;
    role: string;
    city: string;
    tone: string;
    signature: string;
    now: string; // ISO datetime the demo pretends it is
    goalsThisWeek: string[];
    team: { name: string; role: string; handle: string }[];
  };
  inbox: {
    id: string; // "e1"…
    from: { name: string; email: string; company?: string };
    subject: string;
    body: string;
    receivedAt: string;
    labels: string[]; // "wholesale", "newsletter", "investor"…
  }[];
  calendar: {
    id: string; // "c1"…
    title: string;
    start: string;
    end: string;
    with: string[];
    location?: string;
  }[];
  sales: { id: string; date: string; product: string; channel: "web" | "wholesale" | "cafe"; units: number; revenue: number }[];
  notes: string; // markdown
  sponsors: { id: string; brand: string; category: string; offer: string; cta: string; matchesWhen: string }[];
}
