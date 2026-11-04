import { CARD_KINDS, type CardKind, type Verdict } from "./schemas";

/** Pure taste math: every gesture nudges the weight of the card's kind. */

export type Weights = Record<CardKind, number>;

export const WEIGHT_MIN = 0.2;
export const WEIGHT_MAX = 2.5;

export const VERDICT_DELTA: Record<Verdict, number> = { approve: 0.15, dismiss: -0.25, edit: 0.05 };

const PLURAL: Record<CardKind, string> = {
  email_reply: "email replies",
  team_update: "team updates",
  schedule: "scheduling fixes",
  social_post: "social posts",
  task: "tasks",
  insight: "insights",
  snap: "photo cards",
  sponsored: "sponsored offers",
};

export function initialWeights(): Weights {
  return Object.fromEntries(CARD_KINDS.map((k) => [k, 1])) as Weights;
}

export function applyVerdict(weights: Weights, kind: CardKind, verdict: Verdict): Weights {
  const raw = weights[kind] + VERDICT_DELTA[verdict];
  const next = Math.round(Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, raw)) * 100) / 100;
  return { ...weights, [kind]: next };
}

export function tunedMessage(kind: CardKind, verdict: Verdict): string {
  return `Tuned: ${verdict === "dismiss" ? "fewer" : "more"} ${PLURAL[kind]}`;
}
