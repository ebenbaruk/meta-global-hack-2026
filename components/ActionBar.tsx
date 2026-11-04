import { MessageCircle, PenLine, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Approve (the yellow pill) · Dive in · Edit · Dismiss. Buttons are the fallback for swipes. */
export function ActionBar({
  label,
  onApprove,
  onEdit,
  onDismiss,
  onDiveIn,
}: {
  label: string;
  onApprove: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  onDiveIn: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-4 pt-1 pb-4" onPointerDown={(e) => e.stopPropagation()}>
      <Button data-testid="approve-btn" onClick={onApprove} className="h-12! min-w-0 flex-1 px-3! text-[14.5px]! tracking-[-0.01em]">
        <span className="truncate">{label}</span>
      </Button>
      <IconButton testId="divein-btn" label="Dive in" onClick={onDiveIn}>
        <MessageCircle className="size-[18px]" />
      </IconButton>
      <IconButton testId="edit-btn" label="Edit" onClick={onEdit}>
        <PenLine className="size-[18px]" />
      </IconButton>
      <IconButton testId="dismiss-btn" label="Dismiss" onClick={onDismiss} danger>
        <X className="size-[18px]" strokeWidth={2.5} />
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
        "grid size-11 shrink-0 place-items-center rounded-full border border-line bg-elevated text-ink transition-[transform,border-color,color] duration-150 hover:border-line-strong active:scale-90",
        danger && "hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}
