import {
  BadgeDollarSign,
  BarChart3,
  CalendarClock,
  Camera,
  ListChecks,
  Mail,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CardKind } from "@/lib/schemas";

export interface KindMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind text color class for the kind icon on a neutral surface (readable in both themes). */
  tint: string;
  /** The kind's pastel "can" fill (always paired with text-onpastel), see docs/DESIGN.md §1. */
  can: string;
  /** Which agent prepared it, for the typed byline. */
  agent: string;
  /** Past-tense confirmation, shown once the action ran. */
  verbPast: string;
}

export const KIND_META: Record<CardKind, KindMeta> = {
  email_reply: { label: "Email reply", icon: Mail, tint: "text-ink", can: "bg-sky", agent: "Inbox agent", verbPast: "Reply sent" },
  team_update: { label: "Team update", icon: BarChart3, tint: "text-ink", can: "bg-mint", agent: "Sales agent", verbPast: "Update posted" },
  schedule: { label: "Schedule", icon: CalendarClock, tint: "text-ink", can: "bg-tangerine", agent: "Calendar agent", verbPast: "Event moved" },
  social_post: { label: "Social post", icon: Camera, tint: "text-ink", can: "bg-rose", agent: "Social agent", verbPast: "Post published" },
  task: { label: "Task", icon: ListChecks, tint: "text-ink", can: "bg-elevated", agent: "Ops agent", verbPast: "Task created" },
  insight: { label: "Insight", icon: Sparkles, tint: "text-lilac-ink", can: "bg-lilac", agent: "Insight agent", verbPast: "Saved as task" },
  snap: { label: "Snap", icon: ScanLine, tint: "text-ink", can: "bg-mint", agent: "Snap agent", verbPast: "Expense logged" },
  sponsored: { label: "Sponsored", icon: BadgeDollarSign, tint: "text-ink", can: "bg-yellow", agent: "Partner offer", verbPast: "Offer opened" },
};
