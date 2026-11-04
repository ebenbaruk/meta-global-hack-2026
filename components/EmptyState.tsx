import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A designed empty state: glowing icon, a title, one line, an optional action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-9">
        <div className="absolute inset-0 animate-pulse rounded-full bg-accent/30 blur-2xl [animation-duration:3s]" />
        <div className="absolute -inset-3 rounded-[26px] border border-accent/15" />
        <div className="absolute -inset-6 rounded-[32px] border border-accent/[0.07]" />
        <div className="glass-border relative grid size-16 place-items-center rounded-[20px] bg-elevated">
          <Icon className="size-7 text-accent-strong" strokeWidth={1.75} />
        </div>
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
      <p className="mt-1.5 max-w-[280px] text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
