import { cn } from "@/lib/cn";
import type { CardKind } from "@/lib/schemas";
import { KIND_META } from "./kindMeta";

/** The kind as a pastel "can" chip: pastel fill, ink outline, icon + typed caps. Task is the one ink-on-paper chip. */
export function KindSticker({ kind, className }: { kind: CardKind; className?: string }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const paper = kind === "task";
  return (
    <span
      className={cn(
        "typed inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-2.5 text-[10.5px] leading-none font-bold",
        paper ? "border-line-strong bg-elevated text-ink" : cn("border-onpastel text-onpastel", meta.can),
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
      {meta.label}
    </span>
  );
}
