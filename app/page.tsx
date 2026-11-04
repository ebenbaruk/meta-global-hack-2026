"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AgentLens } from "@/components/AgentLens";
import { ChatSheet } from "@/components/ChatSheet";
import { EditSheet } from "@/components/EditSheet";
import { Feed } from "@/components/Feed";
import { Outbox } from "@/components/Outbox";
import { Sheet } from "@/components/Sheet";
import { SnapSheet } from "@/components/SnapSheet";
import { SideNav, TabBar, useIsDesktop, type Tab } from "@/components/TabBar";
import { TastePanel } from "@/components/TastePanel";
import { Toaster } from "@/components/Toast";
import { TopBar, Wordmark } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import { isPlaceholder } from "@/lib/ranker";
import type { Card } from "@/lib/schemas";
import { useFeed } from "@/lib/store";

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
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <div className="relative z-10 mx-auto grid max-w-[1480px] grid-cols-1 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_520px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="no-scrollbar sticky top-0 ml-auto flex h-dvh max-w-[340px] flex-col gap-4 overflow-y-auto pb-6">
            <div className="flex h-14 shrink-0 items-center px-1">
              <Wordmark />
            </div>
            {desktop && <SideNav tab={tab} onTab={changeTab} onSnap={() => setSnapOpen(true)} />}
            {hydrated && <TastePanel />}
          </div>
        </aside>

        <main className="relative z-20 min-w-0">
          <TopBar tab={tab} onOpenLens={() => setLensOpen(true)} />
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

        <aside className="hidden lg:block">
          <div className="sticky top-0 flex h-dvh max-w-[400px] flex-col pt-[18px] pb-6">
            {hydrated && <AgentLens className="flex-1" />}
          </div>
        </aside>
      </div>

      {!desktop && <TabBar tab={tab} onTab={changeTab} onSnap={() => setSnapOpen(true)} />}
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

      <MobileLens open={lensOpen} onClose={closeLens} />
    </>
  );
}

/** On mobile the Agent Lens and the taste profile live in one sheet. */
function MobileLens({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<"lens" | "taste">("lens");
  return (
    <Sheet open={open} onClose={onClose} title="Under the hood" subtitle="What your agents are doing, and what they learned">
      <div className="mb-4 grid grid-cols-2 rounded-full bg-white/[0.05] p-1">
        {(["lens", "taste"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "relative h-9 rounded-full text-[13px] font-medium transition-colors",
              view === v ? "text-fg" : "text-faint",
            )}
          >
            {view === v && (
              <motion.span layoutId="lens-seg" className="absolute inset-0 rounded-full bg-white/[0.09]" />
            )}
            <span className="relative">{v === "lens" ? "Agent Lens" : "Taste"}</span>
          </button>
        ))}
      </div>
      {view === "lens" ? <AgentLens compact className="h-[62dvh]" /> : <TastePanel />}
    </Sheet>
  );
}
