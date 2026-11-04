"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { CardEditor } from "@/components/cards/CardEditor";
import { KIND_META } from "@/components/cards/kindMeta";
import { Sheet } from "@/components/Sheet";
import type { Card } from "@/lib/schemas";

/** Edit the prepared work before it goes out. Mount with a `key` per card so the draft resets. */
export function EditSheet({
  card,
  open,
  onClose,
  onSave,
  onSaveAndApprove,
}: {
  card: Card | null;
  open: boolean;
  onClose: () => void;
  onSave: (payload: Card["payload"]) => void;
  onSaveAndApprove: (payload: Card["payload"]) => void;
}) {
  const [draft, setDraft] = useState<Card["payload"] | null>(card?.payload ?? null);
  const editing = card && draft ? ({ ...card, payload: draft } as Card) : null;

  return (
    <Sheet
      open={open && !!editing}
      onClose={onClose}
      testId="edit-sheet"
      title={editing ? `Edit ${KIND_META[editing.kind].label.toLowerCase()}` : undefined}
      subtitle={editing?.title}
      footer={
        editing && (
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="edit-save"
              onClick={() => onSave(editing.payload)}
              className="h-11 flex-1 rounded-full bg-white/[0.07] text-[14.5px] font-medium text-fg transition hover:bg-white/[0.12]"
            >
              Save
            </button>
            <button
              type="button"
              data-testid="edit-save-approve"
              onClick={() => onSaveAndApprove(editing.payload)}
              className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-full bg-accent text-[14.5px] font-semibold text-white shadow-[0_8px_24px_-10px_rgb(61_123_255/0.9)] transition hover:bg-accent-strong"
            >
              <Check className="size-4" strokeWidth={2.5} />
              Save &amp; {editing.actionLabel.charAt(0).toLowerCase() + editing.actionLabel.slice(1)}
            </button>
          </div>
        )
      }
    >
      {editing && <CardEditor card={editing} onChange={setDraft} />}
    </Sheet>
  );
}
