"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AgentLens } from "@/components/AgentLens";
import { ChatSheet } from "@/components/ChatSheet";
import { DeviceFrame, scrollAppToTop, useIsDesktop } from "@/components/DeviceFrame";
import { EditSheet } from "@/components/EditSheet";
import { Feed } from "@/components/Feed";
import { Outbox } from "@/components/Outbox";
import { Sheet } from "@/components/Sheet";
import { SnapSheet } from "@/components/SnapSheet";
import { TabBar, type Tab } from "@/components/TabBar";
import { TastePanel } from "@/components/TastePanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/Toast";
import { OVERNIGHT, TopBar } from "@/components/TopBar";
import { Logo } from "@/components/ui/Logo";
import { Marquee } from "@/components/ui/Marquee";
import { Sticker } from "@/components/ui/Sticker";
import { cn } from "@/lib/cn";
import { isPlaceholder } from "@/lib/ranker";
import type { Card } from "@/lib/schemas";
import { selectPreparingCount, selectReadyCount, useFeed } from "@/lib/store";

export default function Page() {
  const hydrated = useFeed((s) => s.hydrated);
  const batch = useFeed((s) => s.batch);
  const items = useFeed((s) => s.items);
  const { loadBatch, approve, edit, revise, snap } = useFeed.getState();

  const desktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>("feed");
  const [snapOpen, setSnapOpen] = useState(false);
  const [lensOpen, setLensOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    void useFeed.persist.rehydrate()?.then(() => useFeed.setState({ hydrated: true }));
  }, []);

  // First load (and after a reset): fetch the first batch.
  useEffect(() => {
    if (hydrated && batch === 0) void loadBatch();
  }, [hydrated, batch, loadBatch]);

  const findCard = (id: string | null) => {
    const item = id ? items.find((i) => i.id === id) : undefined;
    return item && !isPlaceholder(item) ? item : null;
  };
  const editCard = findCard(editId);
  const chatCard = findCard(chatId);

  const closeEdit = useCallback(() => setEditId(null), []);
  const closeChat = useCallback(() => setChatId(null), []);
  const closeSnap = useCallback(() => setSnapOpen(false), []);
  const closeLens = useCallback(() => setLensOpen(false), []);

  const changeTab = (next: Tab) => {
    setTab(next);
    scrollAppToTop();
  };

  return (
    <div className="relative mx-auto lg:grid lg:h-dvh lg:max-w-[1560px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-12 lg:overflow-hidden lg:px-10 xl:gap-16">
      {desktop && <StageIntro />}

      <DeviceFrame>
        <TopBar onOpenLens={desktop ? undefined : () => setLensOpen(true)} />
        <main className="relative min-w-0 px-4">
          {hydrated && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "feed" ? (
                  <Feed onEdit={(c: Card) => setEditId(c.id)} onDiveIn={(c: Card) => setChatId(c.id)} />
                ) : (
                  <Outbox onBrowse={() => changeTab("feed")} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <TabBar tab={tab} onTab={changeTab} onSnap={() => setSnapOpen(true)} />
        <Toaster />

        <EditSheet
          key={editCard?.id ?? "none"}
          card={editCard}
          open={!!editCard}
          onClose={closeEdit}
          onSave={(payload) => {
            if (editCard) edit(editCard.id, payload);
            closeEdit();
          }}
          onSaveAndApprove={(payload) => {
            if (editCard) {
              edit(editCard.id, payload);
              void approve(editCard.id);
            }
            closeEdit();
          }}
        />

        <ChatSheet
          card={chatCard}
          open={!!chatCard}
          onClose={closeChat}
          onRevise={(payload) => chatCard && revise(chatCard.id, payload)}
        />

        <SnapSheet
          open={snapOpen}
          onClose={closeSnap}
          onSubmit={(img) => {
            setSnapOpen(false);
            changeTab("feed");
            void snap(img);
          }}
        />

        {!desktop && <MobileLens open={lensOpen} onClose={closeLens} />}
      </DeviceFrame>

      {desktop && <UnderTheHood ready={hydrated} />}
    </div>
  );
}

/** Desktop left column: Maya's morning, what the agents read overnight, and her taste profile. */
function StageIntro() {
  const hydrated = useFeed((s) => s.hydrated);
  const ready = useFeed(selectReadyCount);
  const preparing = useFeed(selectPreparingCount);
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const hour = new Date().getHours();
  const hello = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  let status: string;
  if (ready > 0) status = `${ready} thing${ready === 1 ? " is" : "s are"} waiting on the phone.`;
  else if (preparing > 0) status = `${preparing} drafts are being written right now.`;
  else status = "They're getting today ready.";

  return (
    <aside className="no-scrollbar flex h-full min-h-0 flex-col overflow-y-auto py-8">
      <div className="flex items-center justify-between">
        <Logo markClassName="-rotate-6" />
        <ThemeToggle />
      </div>

      <div className="mt-[clamp(24px,7vh,72px)]">
        <p className="typed text-muted">{date} · Ember &amp; Oak Coffee</p>
        <h1 className="mt-3 font-display text-[clamp(44px,4.2vw,66px)] leading-[0.92] font-black text-ink">
          {hello},{" "}
          <span className="relative inline-block">
            <span aria-hidden className="absolute inset-x-[-4px] bottom-[0.08em] h-[0.34em] -rotate-1 rounded-full bg-lilac" />
            <span className="relative">Maya.</span>
          </span>
        </h1>
        <p className="mt-5 max-w-[400px] text-[16px] leading-relaxed text-muted">
          While you slept, your agents read the inbox, the calendar and two weeks of sales.{" "}
          <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-ink">
            {status}
          </motion.span>
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Sticker tone="sky" rotate={-5}>15 emails</Sticker>
          <Sticker tone="tangerine" rotate={4}>14 events</Sticker>
          <Sticker tone="mint" rotate={-3}>14 days of sales</Sticker>
        </div>
      </div>

      {/* A strip of lilac tape across the column. */}
      <div className="-mx-3 mt-8 -rotate-2">
        <Marquee items={OVERNIGHT} speed={40} className="border-y-[1.5px] border-onpastel bg-lilac py-2 text-onpastel" />
      </div>

      {hydrated && <TastePanel className="mt-8" />}
    </aside>
  );
}

/** Desktop right column: the Agent Lens, every model call as a typed log. */
function UnderTheHood({ ready }: { ready: boolean }) {
  return (
    <aside className="flex h-full min-h-0 flex-col py-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-[clamp(32px,2.8vw,44px)] leading-[0.95] font-black text-ink">Under the hood</h2>
        <Sticker tone="yellow" rotate={5} className="mb-1">Live</Sticker>
      </div>
      <p className="typed mt-2 text-muted">Every model call, as it happens</p>
      {ready && <AgentLens className="mt-5 min-h-0 flex-1" />}
    </aside>
  );
}

/** On mobile the Agent Lens and the taste profile live in one sheet. */
function MobileLens({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<"lens" | "taste">("lens");
  return (
    <Sheet open={open} onClose={onClose} title="Under the hood" subtitle="What your agents do, and what they learned">
      <div className="mb-4 grid grid-cols-2 rounded-full border border-line bg-elevated p-1">
        {(["lens", "taste"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "typed relative h-9 rounded-full text-[11px] font-bold transition-colors",
              view === v ? "text-onpastel" : "text-muted hover:text-ink",
            )}
          >
            {view === v && (
              <motion.span
                layoutId="lens-seg"
                className="absolute inset-0 rounded-full border-[1.5px] border-onpastel bg-lilac"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{v === "lens" ? "Agent Lens" : "Taste"}</span>
          </button>
        ))}
      </div>
      {view === "lens" ? <AgentLens compact className="h-[62dvh]" /> : <TastePanel />}
    </Sheet>
  );
}
