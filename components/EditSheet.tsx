"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { CardEditor } from "@/components/cards/CardEditor";
import { KIND_META } from "@/components/cards/kindMeta";
import { Sheet } from "@/components/Sheet";
import { kindTile } from "@/components/TastePanel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
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
            <Button variant="secondary" data-testid="edit-save" onClick={() => onSave(editing.payload)} className="shrink-0">
              Save
            </Button>
            <Button data-testid="edit-save-approve" onClick={() => onSaveAndApprove(editing.payload)} className="min-w-0 flex-1">
              <Check className="size-4" strokeWidth={2.75} />
              <span className="truncate">Save &amp; {editing.actionLabel.charAt(0).toLowerCase() + editing.actionLabel.slice(1)}</span>
            </Button>
          </div>
        )
      }
    >
      {editing && (
        <>
          <p className="typed mb-4 flex items-center gap-2 text-[10px] text-faint">
            <span className={cn("size-2.5 rounded-full", kindTile(editing.kind))} aria-hidden />
            Drafted by your agent · edit anything
          </p>
          <CardEditor card={editing} onChange={setDraft} />
        </>
      )}
    </Sheet>
  );
}
