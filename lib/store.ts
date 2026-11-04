import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { streamEvents } from "./feedClient";
import { isPlaceholder, type FeedItem, type Placeholder } from "./ranker";
import { TOOL_BY_KIND, type Card, type CardKind, type FeedEvent, type Receipt, type TasteProfile, type TraceEvent, type Verdict } from "./schemas";
import { applyVerdict, initialWeights, tunedMessage, VERDICT_DELTA } from "./taste";

export const MAX_AUTO_BATCHES = 4;
const LEARN_EVERY = 3;
const TRACE_LIMIT = 200;
const PERSISTED_TRACES = 60;
const TOAST_MS = 3400;

export type OutboxEntry = Receipt & { state: "sending" | "done" };
export interface Toast {
  id: string;
  tone: "success" | "tuned" | "learned" | "error";
  title: string;
  detail?: string;
}
export interface Snapshot {
  dataUrl: string;
  width: number;
  height: number;
}

interface Data {
  items: FeedItem[];
  outbox: OutboxEntry[];
  taste: TasteProfile;
  traces: TraceEvent[];
  batch: number;
  loading: boolean;
  snapping: boolean;
  toasts: Toast[];
  /** Drives the exit direction of the card that just left. */
  lastVerdict: Verdict;
  /** Last weight change, for the Taste panel highlight and the Ranker stage. */
  lastTuned?: { kind: CardKind; delta: number; at: number };
  hydrated: boolean;
  /** When the morning feed was prepared ahead of time (overnight run), if it was. */
  preparedAt: number | null;
}

interface Actions {
  loadBatch: (opts?: { force?: boolean }) => Promise<void>;
  approve: (id: string) => Promise<void>;
  dismiss: (id: string) => void;
  edit: (id: string, payload: Card["payload"]) => void;
  revise: (id: string, payload: Card["payload"]) => void;
  retry: (id: string) => void;
  snap: (img: Snapshot) => Promise<void>;
  toast: (t: Omit<Toast, "id">) => void;
  /** Adds model calls made outside the feed stream (Dive in chat, revise) to the Agent Lens. */
  trace: (traces: TraceEvent[]) => void;
  reset: () => void;
}

export type FeedState = Data & Actions;

const initialData = (): Data => ({
  items: [],
  outbox: [],
  taste: { weights: initialWeights(), notes: [], history: [] },
  traces: [],
  batch: 0,
  loading: false,
  snapping: false,
  toasts: [],
  lastVerdict: "approve",
  hydrated: false,
  preparedAt: null,
});

let seq = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Aborts every in-flight stream on reset. */
let streams = new AbortController();

const findCard = (items: FeedItem[], id: string): Card | undefined => {
  const item = items.find((i) => i.id === id);
  return item && !isPlaceholder(item) ? item : undefined;
};

export const useFeed = create<FeedState>()(
  persist(
    (set, get) => {
      const pushTraces = (traces: TraceEvent[]) =>
        set((s) => ({ traces: [...traces, ...s.traces].slice(0, TRACE_LIMIT) }));

      const replaceItem = (id: string, fn: (item: FeedItem) => FeedItem) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? fn(i) : i)) }));

      /** Applies one stream event. `top` streams (snap) insert their placeholders at the top, in order. */
      const handleEvent = (e: FeedEvent, owned: Set<string>, top: boolean) => {
        switch (e.type) {
          case "trace":
            pushTraces([e.trace]);
            return;
          case "skeleton": {
            const existing = get().items.find((i) => i.id === e.id);
            if (existing) {
              if (isPlaceholder(existing)) replaceItem(e.id, () => ({ ...existing, kind: e.kind, label: e.label }));
              return;
            }
            const placeholder: Placeholder = { id: e.id, kind: e.kind, label: e.label, status: "preparing", createdAt: Date.now() };
            const at = top ? [...owned].filter((id) => get().items.some((i) => i.id === id)).length : -1;
            owned.add(e.id);
            set((s) => {
              const items = [...s.items];
              if (at < 0) items.push(placeholder);
              else items.splice(at, 0, placeholder);
              return { items };
            });
            return;
          }
          case "card": {
            const card = { ...e.card, status: "ready", createdAt: e.card.createdAt || Date.now() } as Card;
            owned.add(card.id);
            if (get().items.some((i) => i.id === card.id)) replaceItem(card.id, () => card);
            else set((s) => ({ items: top ? [card, ...s.items] : [...s.items, card] }));
            return;
          }
          case "image":
            replaceItem(e.id, (i) => (isPlaceholder(i) ? i : ({ ...i, image: e.image, imageStatus: "ready" } as Card)));
            return;
          case "image_error":
            replaceItem(e.id, (i) => (isPlaceholder(i) ? i : ({ ...i, imageStatus: "error" } as Card)));
            return;
          case "card_error": {
            const item = get().items.find((i) => i.id === e.id);
            if (!item) {
              get().toast({ tone: "error", title: "Your agents hit a snag", detail: e.message });
            } else if (isPlaceholder(item)) {
              replaceItem(e.id, () => ({ ...item, status: "error", error: e.message }));
            } else if (item.imageStatus === "loading") {
              replaceItem(e.id, () => ({ ...item, imageStatus: "error" }) as Card);
            }
            return;
          }
          case "drop":
            set((s) => ({ items: s.items.filter((i) => i.id !== e.id || !isPlaceholder(i)) }));
            return;
          case "prepared":
            set({ preparedAt: e.at });
            return;
          case "done":
            return;
        }
      };

      /** Runs one NDJSON stream; placeholders it left unfinished become retryable errors. */
      const runStream = async (url: string, body: unknown, top: boolean) => {
        const owned = new Set<string>();
        const signal = streams.signal;
        try {
          await streamEvents(url, body, (e) => handleEvent(e, owned, top), signal);
        } catch (err) {
          if (signal.aborted) return;
          get().toast({ tone: "error", title: "Couldn't reach your agents", detail: err instanceof Error ? err.message : undefined });
        }
        if (signal.aborted) return;
        set((s) => ({
          items: s.items.map((i) =>
            owned.has(i.id) && isPlaceholder(i) && i.status === "preparing"
              ? { ...i, status: "error", error: "The agent stopped before finishing." }
              : i,
          ),
        }));
      };

      const refreshNotes = async () => {
        const before = get().taste.notes;
        try {
          const res = await fetch("/api/taste", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ history: get().taste.history }),
            signal: streams.signal,
          });
          const data = (await res.json()) as { notes?: string[]; traces?: TraceEvent[] };
          if (data.traces?.length) pushTraces([...data.traces].reverse());
          if (!res.ok || !data.notes?.length) return;
          const notes = data.notes;
          set((s) => ({ taste: { ...s.taste, notes } }));
          const newest = notes.find((n) => !before.includes(n));
          if (newest) get().toast({ tone: "learned", title: "Learned", detail: newest });
        } catch {
          // Notes are a bonus; the weights already moved.
        }
      };

      /** Records a gesture: moves the weight, logs history, and every few gestures rewrites the notes. */
      const learn = (card: Card, verdict: Verdict) => {
        set((s) => ({
          taste: {
            ...s.taste,
            weights: applyVerdict(s.taste.weights, card.kind, verdict),
            history: [...s.taste.history, { cardId: card.id, kind: card.kind, title: card.title, verdict }],
          },
          lastTuned: { kind: card.kind, delta: VERDICT_DELTA[verdict], at: Date.now() },
        }));
        if (get().taste.history.length % LEARN_EVERY === 0) void refreshNotes();
      };

      const unlearn = (card: Card, weight: number) =>
        set((s) => ({
          taste: {
            ...s.taste,
            weights: { ...s.taste.weights, [card.kind]: weight },
            history: s.taste.history.filter((h) => h.cardId !== card.id),
          },
        }));

      return {
        ...initialData(),

        loadBatch: async ({ force = false } = {}) => {
          const s = get();
          if (s.loading || (!force && s.batch >= MAX_AUTO_BATCHES)) return;
          const batch = s.batch + 1;
          set({ loading: true, batch });
          const seenTitles = [
            ...new Set([
              ...s.items.filter((i) => !isPlaceholder(i)).map((c) => (c as Card).title),
              ...s.taste.history.map((h) => h.title),
            ]),
          ];
          const signal = streams.signal;
          await runStream("/api/feed", { notes: s.taste.notes, seenTitles, batch }, false);
          if (!signal.aborted) set({ loading: false });
        },

        approve: async (id) => {
          const card = findCard(get().items, id);
          if (!card) return;
          const index = get().items.indexOf(card);
          const previousWeight = get().taste.weights[card.kind];
          const pending: OutboxEntry = {
            id: uid("pending-"),
            cardId: card.id,
            kind: card.kind,
            tool: TOOL_BY_KIND[card.kind],
            title: card.title,
            detail: card.actionLabel,
            at: Date.now(),
            state: "sending",
          };
          set((s) => ({ items: s.items.filter((i) => i.id !== id), outbox: [pending, ...s.outbox], lastVerdict: "approve" }));
          learn(card, "approve");

          const started = Date.now();
          try {
            const res = await fetch("/api/act", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ card }),
              signal: streams.signal,
            });
            if (!res.ok) throw new Error(`act failed (${res.status})`);
            const { receipt } = (await res.json()) as { receipt: Receipt };
            set((s) => ({ outbox: s.outbox.map((e) => (e.id === pending.id ? { ...receipt, state: "done" } : e)) }));
            pushTraces([
              {
                id: uid("act-"),
                step: `Executor · ${receipt.tool}`,
                model: "sandbox",
                ms: Date.now() - started,
                status: "ok",
                detail: receipt.title,
                at: Date.now(),
              },
            ]);
            get().toast({ tone: "success", title: receipt.title, detail: tunedMessage(card.kind, "approve") });
          } catch {
            if (streams.signal.aborted) return;
            set((s) => {
              const items = [...s.items];
              items.splice(Math.min(index, items.length), 0, card);
              return { items, outbox: s.outbox.filter((e) => e.id !== pending.id) };
            });
            unlearn(card, previousWeight);
            get().toast({ tone: "error", title: "Couldn't complete that", detail: "The card is back in your feed. Try again." });
          }
        },

        dismiss: (id) => {
          const card = findCard(get().items, id);
          if (!card) return;
          set((s) => ({ items: s.items.filter((i) => i.id !== id), lastVerdict: "dismiss" }));
          learn(card, "dismiss");
          get().toast({ tone: "tuned", title: tunedMessage(card.kind, "dismiss") });
        },

        edit: (id, payload) => {
          const card = findCard(get().items, id);
          if (!card) return;
          const edited = { ...card, payload } as Card;
          replaceItem(id, () => edited);
          learn(edited, "edit");
        },

        revise: (id, payload) => replaceItem(id, (i) => (isPlaceholder(i) ? i : ({ ...i, payload } as Card))),

        retry: (id) => {
          set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
          void get().loadBatch({ force: true });
        },

        snap: async (img) => {
          set({ snapping: true });
          const signal = streams.signal;
          await runStream("/api/snap", { image: img.dataUrl, width: img.width, height: img.height }, true);
          if (!signal.aborted) set({ snapping: false });
        },

        toast: (t) => {
          const toast = { ...t, id: uid("toast-") };
          set((s) => ({ toasts: [...s.toasts, toast].slice(-2) }));
          setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== toast.id) })), TOAST_MS);
        },

        trace: (traces) => pushTraces(traces),

      reset: () => {
          streams.abort();
          streams = new AbortController();
          set({ ...initialData(), hydrated: true });
        },
      };
    },
    {
      name: "feedforward:v1",
      version: 1,
      skipHydration: true,
      storage: safeStorage(),
      // A reload mid-stream can persist a batch with no cards: start over instead of an empty feed.
      merge: (persisted, current) => {
        const p = persisted as Partial<Persisted> | undefined;
        return { ...current, ...p, batch: p?.items?.length ? (p.batch ?? 0) : 0 };
      },
      partialize: (s) => ({
        items: s.items
          .filter((i): i is Card => !isPlaceholder(i))
          .map((c) => (c.imageStatus === "loading" ? ({ ...c, imageStatus: undefined } as Card) : c)),
        outbox: s.outbox.filter((e) => e.state === "done"),
        taste: s.taste,
        traces: s.traces.slice(0, PERSISTED_TRACES),
        batch: s.batch,
        preparedAt: s.preparedAt,
      }),
    },
  ),
);

type Persisted = Pick<Data, "items" | "outbox" | "taste" | "traces" | "batch" | "preparedAt">;

/** localStorage that survives the quota: if images don't fit, it saves without them. */
function safeStorage(): PersistStorage<Persisted> {
  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name);
        return raw ? (JSON.parse(raw) as StorageValue<Persisted>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch {
        const items = value.state.items.map((c) => ({ ...c, image: undefined, imageStatus: undefined }) as FeedItem);
        try {
          localStorage.setItem(name, JSON.stringify({ ...value, state: { ...value.state, items } }));
        } catch {
          // Storage unavailable: the session still works, it just won't survive a reload.
        }
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}

/** Derived counts used by the shell. */
export const selectReadyCount = (s: FeedState) => s.items.filter((i) => !isPlaceholder(i)).length;
export const selectPreparingCount = (s: FeedState) =>
  s.items.filter((i) => isPlaceholder(i) && i.status === "preparing").length;
