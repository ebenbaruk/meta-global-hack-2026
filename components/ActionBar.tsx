import { Check, MessageCircle, PenLine, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Approve (primary) · Dive in · Edit · Dismiss. Buttons are the fallback for swipes. */
export function ActionBar({
  label,
  sponsored,
  onApprove,
  onEdit,
  onDismiss,
  onDiveIn,
}: {
  label: string;
  sponsored?: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  onDiveIn: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-line p-3 max-[380px]:gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        data-testid="approve-btn"
        onClick={onApprove}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[14.5px] font-semibold transition active:scale-[0.98] max-[380px]:px-3 max-[380px]:text-[14px]",
          sponsored
            ? "bg-sponsor text-[#1d1606] hover:brightness-110"
            : "bg-accent text-white shadow-[0_8px_24px_-10px_rgb(61_123_255/0.9)] hover:brightness-110",
        )}
      >
        <Check className="size-4 shrink-0 max-[380px]:hidden" strokeWidth={2.5} />
        <span className="truncate">{label}</span>
      </button>
      <IconButton testId="divein-btn" label="Dive in" onClick={onDiveIn}>
        <MessageCircle className="size-[18px]" />
      </IconButton>
      <IconButton testId="edit-btn" label="Edit" onClick={onEdit}>
        <PenLine className="size-[18px]" />
      </IconButton>
      <IconButton testId="dismiss-btn" label="Dismiss" onClick={onDismiss} danger>
        <X className="size-[18px]" />
      </IconButton>
    </div>
  );
}

function IconButton({
  testId,
  label,
  onClick,
  danger,
  children,
}: {
  testId: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-11 shrink-0 place-items-center max-[380px]:size-10 rounded-full bg-white/[0.05] text-muted transition hover:bg-white/[0.1] hover:text-fg active:scale-95",
        danger && "hover:bg-danger/12 hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}
