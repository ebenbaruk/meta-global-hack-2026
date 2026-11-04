"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { Camera, ImageUp, LoaderCircle, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Sticker } from "@/components/ui/Sticker";
import { lockAppScroll } from "@/components/DeviceFrame";
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
    const unlock = lockAppScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
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
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-onpastel/50"
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
            className="relative max-h-[calc(100%-max(var(--safe-top,0px),44px)-12px)] w-full max-w-[560px] overflow-y-auto overscroll-contain rounded-t-[32px] border-[1.5px] border-b-0 border-line-strong bg-surface pb-[max(var(--safe-bottom,0px),20px)] shadow-pop"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : SPRING}
            drag={reduce ? false : "y"}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex touch-none justify-center pt-3 pb-1" onPointerDown={(e) => dragControls.start(e)} aria-hidden>
              <span className="h-1.5 w-11 rounded-full bg-line-strong/25" />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-elevated text-ink transition-colors hover:bg-lilac-soft"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>

            <div className="touch-none px-5 pt-2" onPointerDown={(e) => dragControls.start(e)}>
              <Image src="/brand/mascot-scan.webp" alt="" width={88} height={88} className="[filter:drop-shadow(0_0_1px_var(--ink))_drop-shadow(0_0_1px_var(--ink))] -mb-1 -ml-2 size-22" />
              <h2 id="snap-title" className="mt-1 font-display text-[34px] leading-[0.95] font-black text-ink">
                Snap something.
              </h2>
              <p className="mt-2 pr-6 text-[14.5px] leading-[1.5] text-muted">
                An invoice, a shelf, a whiteboard. Your agents read it, outline what matters and prep the next step.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Sticker tone="lilac" rotate={-3}>
                  Muse Spark reads it
                </Sticker>
                <Sticker tone="mint" rotate={2}>
                  SAM 3.1 outlines it
                </Sticker>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 px-5">
              <OptionButton
                label="Take photo"
                sub="Use the camera"
                icon={<Camera className="size-5" strokeWidth={2.2} />}
                primary
                loading={busy === "camera"}
                disabled={!!busy}
                onClick={() => cameraInput.current?.click()}
              />
              <OptionButton
                label="Upload"
                sub="From your library"
                icon={<ImageUp className="size-5" strokeWidth={2.2} />}
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

            <div className="mt-6 px-5">
              <div className="flex items-center gap-3">
                <span className="typed text-[10px] text-faint">Or try a demo photo</span>
                <span className="flex-1 border-t-[1.5px] border-dashed border-line" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 px-1 pb-1">
                {DEMOS.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    data-testid={`snap-demo-${d.id}`}
                    aria-label={`Use the demo photo: ${d.label}`}
                    disabled={!!busy}
                    onClick={() => void submit(d.id, d.src)}
                    className={cn(
                      "group relative rounded-[18px] border-[1.5px] border-line-strong bg-surface p-1.5 pb-2.5 text-left shadow-card transition-transform duration-200 hover:rotate-0 active:scale-[0.97] disabled:opacity-60",
                      i === 0 ? "-rotate-2" : "rotate-2",
                    )}
                  >
                    <span className="relative block overflow-hidden rounded-[12px]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static demo thumbnail */}
                      <img
                        src={d.src}
                        alt=""
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                      {busy === d.id && (
                        <span className="absolute inset-0 grid place-items-center bg-onpastel/40">
                          <span className="grid size-9 place-items-center rounded-full bg-surface">
                            <LoaderCircle className="size-5 animate-spin text-ink" />
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="block px-1.5 pt-2 font-display text-[15px] leading-tight font-bold text-ink">{d.label}</span>
                    <span className="typed block px-1.5 pt-0.5 text-[9px] text-muted">{d.hint}</span>
                    {i === 0 && (
                      <span className="absolute -top-2.5 -right-2">
                        <Sticker tone="yellow" rotate={8}>
                          Try me
                        </Sticker>
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
                  className="mx-5 mt-4 rounded-[14px] border-[1.5px] border-danger px-3 py-2 text-[13px] text-danger"
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
        "flex min-h-[116px] flex-col justify-between rounded-[22px] border-[1.5px] p-4 text-left transition-[transform,box-shadow,background-color] duration-150 disabled:opacity-60",
        primary
          ? "border-onpastel bg-yellow text-onpastel shadow-[3px_3px_0_0_var(--color-onpastel)] hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          : "border-line-strong bg-elevated text-ink hover:bg-lilac-soft active:scale-[0.98]",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full border-[1.5px]",
          primary ? "border-onpastel bg-onpastel text-yellow" : "border-line-strong bg-surface text-ink",
        )}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : icon}
      </span>
      <span>
        <span className="block font-display text-[19px] leading-tight font-extrabold">{label}</span>
        <span className={cn("typed mt-0.5 block text-[9.5px]", primary ? "text-onpastel/75" : "text-muted")}>{sub}</span>
      </span>
    </button>
  );
}
