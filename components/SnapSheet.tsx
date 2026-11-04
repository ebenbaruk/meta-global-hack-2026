"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { Camera, ImageUp, LoaderCircle, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { downscaleImage, type SnapImageInput } from "@/lib/downscale";

const DEMOS = [
  { id: "invoice", src: "/demo/invoice.webp", label: "Supplier invoice", hint: "Log it, confirm the lot" },
  { id: "shelf", src: "/demo/shelf.webp", label: "Stock shelf", hint: "Read the stock room" },
] as const;

const SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;

export function SnapSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (img: SnapImageInput) => void;
}) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(null);
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function submit(id: string, source: Blob | string) {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      onSubmit(await downscaleImage(source));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image");
    } finally {
      setBusy(null);
    }
  }

  const onFile = (id: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file twice
    if (file) void submit(id, file);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="snap-title"
            data-testid="snap-sheet"
            className="glass-border relative w-full max-w-[520px] rounded-t-[28px] bg-surface pb-[max(env(safe-area-inset-bottom),20px)] shadow-card md:rounded-[28px] md:pb-6"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : SPRING}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex touch-none justify-center pt-3 pb-1 md:hidden"
              onPointerDown={(e) => dragControls.start(e)}
              aria-hidden
            >
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white/[0.06] text-muted transition-colors hover:bg-white/10 hover:text-fg"
            >
              <X className="size-4" />
            </button>

            <div className="px-5 pt-3 md:px-6 md:pt-6" onPointerDown={(e) => dragControls.start(e)}>
              <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-success/25 to-accent/20 text-success ring-1 ring-white/10">
                <ScanLine className="size-5" />
              </div>
              <h2 id="snap-title" className="mt-4 text-[22px] font-semibold tracking-tight text-fg">
                Snap something
              </h2>
              <p className="mt-1 text-[14px] leading-[1.5] text-muted">
                An invoice, a shelf, a whiteboard. Agents read it, outline what matters and prepare what&apos;s next.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 px-5 md:px-6">
              <OptionButton
                label="Take photo"
                sub="Use the camera"
                icon={<Camera className="size-5" />}
                primary
                loading={busy === "camera"}
                disabled={!!busy}
                onClick={() => cameraInput.current?.click()}
              />
              <OptionButton
                label="Upload"
                sub="From your library"
                icon={<ImageUp className="size-5" />}
                loading={busy === "upload"}
                disabled={!!busy}
                onClick={() => uploadInput.current?.click()}
              />
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={onFile("camera")}
              />
              <input
                ref={uploadInput}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                data-testid="snap-upload-input"
                onChange={onFile("upload")}
              />
            </div>

            <div className="mt-6 px-5 md:px-6">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium tracking-[0.08em] text-faint uppercase">Try a demo photo</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {DEMOS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    data-testid={`snap-demo-${d.id}`}
                    aria-label={`Use the demo photo: ${d.label}`}
                    disabled={!!busy}
                    onClick={() => void submit(d.id, d.src)}
                    className="group relative overflow-hidden rounded-2xl border border-line text-left transition-transform active:scale-[0.98] disabled:opacity-60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- tiny static demo thumbnail */}
                    <img
                      src={d.src}
                      alt=""
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 via-45% to-transparent" />
                    <span className="absolute inset-x-3 bottom-2.5">
                      <span className="block text-[13px] font-semibold text-white">{d.label}</span>
                      <span className="block text-[11px] text-white/80">{d.hint}</span>
                    </span>
                    {busy === d.id && (
                      <span className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]">
                        <LoaderCircle className="size-5 animate-spin text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger md:mx-6"
                >
                  {error}. Try another photo.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}

function OptionButton({
  label,
  sub,
  icon,
  primary,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  icon: ReactNode;
  primary?: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[112px] flex-col justify-between rounded-2xl p-4 text-left transition-[transform,background-color] active:scale-[0.98] disabled:opacity-60",
        primary
          ? "bg-accent text-white shadow-glow hover:brightness-110"
          : "border border-line-strong bg-elevated text-fg hover:bg-white/[0.06]",
      )}
    >
      <span
        className={cn("grid size-9 place-items-center rounded-xl", primary ? "bg-white/15" : "bg-white/[0.06] text-muted")}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : icon}
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        <span className={cn("block text-[12px]", primary ? "text-white/75" : "text-faint")}>{sub}</span>
      </span>
    </button>
  );
}
