"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const W = 390;
const H = 844;

/**
 * The real app at /app, running inside an ink-outlined phone. The screen is laid out at 390×844
 * and scaled with --s, so the app renders its true mobile layout at any size.
 */
export function PhoneFrame({ className }: { className?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);

  // Keep the app's theme in step with the page's theme toggle (same origin).
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const doc = frame.current?.contentDocument;
      if (!doc?.documentElement) return;
      const t = root.dataset.theme;
      if (t) doc.documentElement.dataset.theme = t;
      else delete doc.documentElement.dataset.theme;
    };
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const el = frame.current;
    el?.addEventListener("load", sync);
    return () => {
      obs.disconnect();
      el?.removeEventListener("load", sync);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative rounded-[calc(62px*var(--s))] border-[1.5px] border-line-strong bg-onpastel p-[calc(11px*var(--s))] shadow-pop",
        className,
      )}
    >
      <div
        className="relative overflow-hidden rounded-[calc(52px*var(--s))] bg-bg"
        style={{ width: `calc(${W}px * var(--s))`, height: `calc(${H}px * var(--s))` }}
      >
        <div className="absolute top-0 left-0 flex origin-top-left flex-col" style={{ width: W, height: H, transform: "scale(var(--s))" }}>
          {/* Status bar, so the island never covers the app's header */}
          <div aria-hidden className="flex h-[50px] shrink-0 items-center justify-between px-9 pt-1 text-[15px] font-semibold text-ink">
            <span>8:30</span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">
                {[5, 7, 9, 11].map((h) => (
                  <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />
                ))}
              </span>
              <span className="ml-1 h-[11px] w-[22px] rounded-[3px] border-[1.5px] border-ink p-[1.5px]">
                <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
              </span>
            </span>
          </div>
          <iframe
            ref={frame}
            src="/app"
            title="Feedforward, live: Maya's feed"
            loading="lazy"
            className="block w-full flex-1 border-0"
          />
        </div>
        {/* Dynamic island */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-onpastel"
          style={{ top: "calc(10px * var(--s))", width: "calc(104px * var(--s))", height: "calc(30px * var(--s))" }}
        />
      </div>
    </div>
  );
}
