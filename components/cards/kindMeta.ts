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
  /** Tailwind text color class for the kind icon. */
  tint: string;
  /** Past-tense confirmation, shown once the action ran. */
  verbPast: string;
}

export const KIND_META: Record<CardKind, KindMeta> = {
  email_reply: { label: "Email reply", icon: Mail, tint: "text-accent-strong", verbPast: "Reply sent" },
  team_update: { label: "Team update", icon: BarChart3, tint: "text-success", verbPast: "Update posted" },
  schedule: { label: "Schedule", icon: CalendarClock, tint: "text-warning", verbPast: "Event moved" },
  social_post: { label: "Social post", icon: Camera, tint: "text-violet", verbPast: "Post published" },
  task: { label: "Task", icon: ListChecks, tint: "text-muted", verbPast: "Task created" },
  insight: { label: "Insight", icon: Sparkles, tint: "text-accent-strong", verbPast: "Saved as task" },
  snap: { label: "Snap", icon: ScanLine, tint: "text-success", verbPast: "Expense logged" },
  sponsored: { label: "Sponsored", icon: BadgeDollarSign, tint: "text-sponsor", verbPast: "Offer opened" },
};
