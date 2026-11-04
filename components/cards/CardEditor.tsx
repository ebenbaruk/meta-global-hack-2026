"use client";

import { Lock, Plus, X } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Card } from "@/lib/schemas";

type Payload = Card["payload"];

const fieldClass =
  "w-full min-w-0 rounded-2xl border-[1.5px] border-line bg-elevated px-3.5 py-3 text-[15px] leading-[1.5] text-ink placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-lilac-ink focus:shadow-[0_0_0_3px_var(--color-lilac-soft)] focus-visible:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="typed text-[10px] text-muted">
          {label}
        </label>
        {hint && <span className="font-mono text-[10.5px] text-faint">{hint}</span>}
      </div>
      {children(id)}
    </div>
  );
}

function AutoTextarea({
  id,
  value,
  onChange,
  minRows = 3,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClass} resize-none overflow-hidden`}
    />
  );
}

function TextInput({ id, value, onChange, type = "text" }: { id?: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />;
}

/** Datetime-local inputs want "YYYY-MM-DDTHH:mm"; payloads may carry seconds. */
const toInputDateTime = (iso: string) => iso.slice(0, 16);

/** Keeps the raw text locally so a trailing space survives while typing the next tag. */
function HashtagInput({ id, hashtags, onChange }: { id: string; hashtags: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState(() => hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" "));
  return (
    <TextInput
      id={id}
      value={text}
      onChange={(v) => {
        setText(v);
        onChange(v.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`)));
      }}
    />
  );
}

function StepsEditor({ steps, onChange }: { steps: string[]; onChange: (steps: string[]) => void }) {
  const set = (i: number, v: string) => onChange(steps.map((s, j) => (j === i ? v : s)));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="typed text-[10px] text-muted">Steps</span>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-3 grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] border-line-strong font-mono text-[10px] font-bold text-ink tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <AutoTextarea value={step} onChange={(v) => set(i, v)} minRows={1} />
            </div>
            <button
              type="button"
              onClick={() => onChange(steps.filter((_, j) => j !== i))}
              aria-label={`Remove step ${i + 1}`}
              className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-elevated hover:text-danger"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onChange([...steps, ""])}
        className="mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line-strong px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-elevated"
      >
        <Plus className="size-3.5" aria-hidden />
        Add step
      </button>
    </div>
  );
}

function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-elevated px-3.5 py-3 text-[14px] text-muted">
      <Lock className="size-4 shrink-0 text-faint" aria-hidden />
      {children}
    </div>
  );
}

/** Editable fields for a card's prepared payload. Fully controlled: every change emits a new payload. */
export function CardEditor({ card, onChange }: { card: Card; onChange: (payload: Payload) => void }) {
  switch (card.kind) {
    case "email_reply": {
      const p = card.payload;
      return (
        <div className="flex flex-col gap-3">
          <Field label="To">{(id) => <TextInput id={id} value={p.to} onChange={(to) => onChange({ ...p, to })} />}</Field>
          <Field label="Subject">
            {(id) => <TextInput id={id} value={p.subject} onChange={(subject) => onChange({ ...p, subject })} />}
          </Field>
          <Field label="Message">
            {(id) => <AutoTextarea id={id} value={p.body} onChange={(body) => onChange({ ...p, body })} minRows={6} />}
          </Field>
        </div>
      );
    }
    case "team_update": {
      const p = card.payload;
      return (
        <Field label="Message" hint={`#${p.channel.replace(/^#/, "")}`}>
          {(id) => <AutoTextarea id={id} value={p.message} onChange={(message) => onChange({ ...p, message })} minRows={4} />}
        </Field>
      );
    }
    case "schedule": {
      const p = card.payload;
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Starts">
              {(id) => (
                <TextInput
                  id={id}
                  type="datetime-local"
                  value={toInputDateTime(p.proposed.start)}
                  onChange={(start) => onChange({ ...p, proposed: { ...p.proposed, start } })}
                />
              )}
            </Field>
            <Field label="Ends">
              {(id) => (
                <TextInput
                  id={id}
                  type="datetime-local"
                  value={toInputDateTime(p.proposed.end)}
                  onChange={(end) => onChange({ ...p, proposed: { ...p.proposed, end } })}
                />
              )}
            </Field>
          </div>
          <Field label="Note to send">
            {(id) => <AutoTextarea id={id} value={p.message} onChange={(message) => onChange({ ...p, message })} minRows={3} />}
          </Field>
        </div>
      );
    }
    case "social_post": {
      const p = card.payload;
      return (
        <div className="flex flex-col gap-3">
          <Field label="Caption" hint={`${p.caption.length}/2200`}>
            {(id) => <AutoTextarea id={id} value={p.caption} onChange={(caption) => onChange({ ...p, caption })} minRows={4} />}
          </Field>
          <Field label="Hashtags" hint="Separate with spaces">
            {(id) => (
              <HashtagInput id={id} hashtags={p.hashtags} onChange={(hashtags) => onChange({ ...p, hashtags })} />
            )}
          </Field>
        </div>
      );
    }
    case "task": {
      const p = card.payload;
      return <StepsEditor steps={p.steps} onChange={(steps) => onChange({ ...p, steps })} />;
    }
    case "insight": {
      const p = card.payload;
      return (
        <div className="flex flex-col gap-3">
          <Field label="Headline">
            {(id) => <TextInput id={id} value={p.headline} onChange={(headline) => onChange({ ...p, headline })} />}
          </Field>
          <Field label="Detail">
            {(id) => <AutoTextarea id={id} value={p.detail} onChange={(detail) => onChange({ ...p, detail })} minRows={3} />}
          </Field>
        </div>
      );
    }
    case "snap":
      return <ReadOnlyNote>Line items come straight from the photo. Nothing to edit.</ReadOnlyNote>;
    case "sponsored":
      return <ReadOnlyNote>Sponsored offers can&apos;t be edited.</ReadOnlyNote>;
  }
}
