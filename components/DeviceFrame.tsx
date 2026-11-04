"use client";

import { useAnimate, useReducedMotion } from "framer-motion";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

/*
 * "The app is always a phone." Below 1024px the app runs full bleed and the window scrolls.
 * From 1024px it is rendered inside a phone: the screen has `transform: translateZ(0)`, so every
 * `position: fixed` descendant (sheets, toasts, tab bar) is pinned to the screen, and an inner
 * element is the scroll container. The tree is identical in both modes; only CSS changes.
 */

const DESKTOP = "(min-width: 1024px)";
const SCROLL_ROOT = "[data-scroll-root]";
/** Logical size of the phone, bezel included (the screen is 400×860). */
const FRAME_W = 420;
const FRAME_H = 880;

/** True from 1024px, where the app moves into the device frame. */
export function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/** The element that scrolls the app: the phone screen on desktop, `null` (the window) on mobile. */
export function appScroller(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(SCROLL_ROOT);
  return el && getComputedStyle(el).overflowY !== "visible" ? el : null;
}

export function scrollAppToTop() {
  (appScroller() ?? window).scrollTo({ top: 0 });
}

/** Locks the app's scroll while a sheet is open. Returns the unlock function. */
export function lockAppScroll(): () => void {
  const el = appScroller() ?? document.body;
  const previous = el.style.overflow;
  el.style.overflow = "hidden";
  return () => {
    el.style.overflow = previous;
  };
}

/** Scale that fits the phone in the viewport height, never above 1. */
function useFitScale(active: boolean, margin: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!active) return;
    const fit = () => setScale(Math.min(1, (window.innerHeight - margin) / FRAME_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [active, margin]);
  return active ? scale : 1;
}

export function DeviceFrame({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const scale = useFitScale(desktop, 56);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  // Tilt-in on load: the phone drops onto the desk with a little wobble.
  useEffect(() => {
    if (!desktop || !scope.current) return;
    if (reduce) {
      void animate(scope.current, { opacity: [0, 1] }, { duration: 0.3 });
      return;
    }
    void animate(scope.current, { opacity: [0, 1] }, { duration: 0.35 });
    void animate(scope.current, { y: [56, 0], rotate: [-6, 0] }, { type: "spring", stiffness: 140, damping: 13, mass: 0.9 });
  }, [desktop, reduce, animate, scope]);

  return (
    <div
      className="relative lg:shrink-0"
      style={desktop ? { width: FRAME_W * scale, height: FRAME_H * scale } : undefined}
    >
      <div
        className="lg:absolute lg:top-0 lg:left-0 lg:origin-top-left"
        style={desktop ? { width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` } : undefined}
      >
        <div
          ref={scope}
          data-testid="device-frame"
          className="relative lg:h-full lg:rounded-[62px] lg:border-[1.5px] lg:border-line-strong lg:bg-onpastel lg:p-[10px] lg:shadow-[10px_12px_0_0_var(--lilac),var(--shadow-pop)]"
        >
          {/* Hardware: side buttons. */}
          <span aria-hidden className="absolute top-[150px] -left-[4.5px] hidden h-8 w-[3px] rounded-l-sm bg-onpastel lg:block" />
          <span aria-hidden className="absolute top-[200px] -left-[4.5px] hidden h-14 w-[3px] rounded-l-sm bg-onpastel lg:block" />
          <span aria-hidden className="absolute top-[268px] -left-[4.5px] hidden h-14 w-[3px] rounded-l-sm bg-onpastel lg:block" />
          <span aria-hidden className="absolute top-[220px] -right-[4.5px] hidden h-20 w-[3px] rounded-r-sm bg-onpastel lg:block" />

          <div
            data-testid="device-screen"
            className="relative [--safe-bottom:max(env(safe-area-inset-bottom),14px)] [--safe-top:env(safe-area-inset-top)] lg:h-full lg:overflow-hidden lg:rounded-[52px] lg:bg-bg lg:[--safe-bottom:22px] lg:[--safe-top:46px] lg:[transform:translateZ(0)]"
          >
            <div data-scroll-root className="no-scrollbar lg:h-full lg:overflow-y-auto lg:overscroll-contain">
              {children}
            </div>
            {desktop && <PhoneChrome />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Status bar, dynamic island and home indicator, drawn over the screen. */
function PhoneChrome() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex h-[46px] items-center justify-between pr-7 pl-9 text-ink"
      >
        <span className="pt-0.5 text-[15px] font-semibold tracking-tight tabular-nums">9:41</span>
        <span className="flex items-center gap-1.5 pt-0.5">
          <Signal className="size-[15px]" strokeWidth={2.6} />
          <Wifi className="size-[15px]" strokeWidth={2.6} />
          <BatteryFull className="size-[22px]" strokeWidth={1.8} />
        </span>
      </div>
      <div aria-hidden className="pointer-events-none absolute top-[11px] left-1/2 z-[71] h-[33px] w-[118px] -translate-x-1/2 rounded-full bg-onpastel" />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[7px] left-1/2 z-[71] h-[5px] w-[132px] -translate-x-1/2 rounded-full bg-ink/80"
      />
    </>
  );
}
