"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A brand illustration or photo from public/brand. Until the file exists, a designed placeholder holds its place. */
export function BrandImage({
  name,
  alt,
  className,
  fallback,
  eager = false,
  outlined = false,
}: {
  /** Ink line art: thicken its outline so it holds up on Night. */
  outlined?: boolean;
  name: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  eager?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  // The error can fire before hydration; check the element once mounted.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed)
    return (
      <div role="img" aria-label={alt} className={cn("grid place-items-center bg-lilac-soft text-lilac-ink", className)}>
        {fallback ?? <span className="typed font-bold">{alt}</span>}
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={`/brand/${name}`}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(outlined && "[filter:drop-shadow(0_0_0.6px_var(--ink))_drop-shadow(0_0_0.6px_var(--ink))]", className)}
    />
  );
}

const CTA = {
  primary:
    "bg-yellow text-onpastel border-[1.5px] border-onpastel shadow-[3px_3px_0_0_var(--color-onpastel)] hover:-translate-y-0.5 hover:shadow-[4px_5px_0_0_var(--color-onpastel)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  secondary: "bg-transparent text-ink border-[1.5px] border-line-strong hover:bg-elevated",
} as const;

/** The design system's pill, as a link. */
export function CtaLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof CTA;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color] duration-150",
        CTA[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** A rotated starburst sticker with typed text in the middle. */
export function Starburst({
  children,
  className,
  tone = "yellow",
}: {
  children: ReactNode;
  className?: string;
  tone?: "yellow" | "lilac" | "mint" | "rose" | "sky" | "tangerine";
}) {
  const points = 14;
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 48 : 39;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <div className={cn("relative grid size-28 place-items-center", className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <polygon
          points={d}
          fill={`var(--color-${tone})`}
          stroke="var(--color-onpastel)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span className="typed relative max-w-[70%] text-center text-[10px] leading-tight font-bold text-onpastel">
        {children}
      </span>
    </div>
  );
}

/** Card-kind colors, the pastel "cans" of the brand. */
export const KIND_TONE = {
  email: "bg-sky",
  team: "bg-mint",
  schedule: "bg-tangerine",
  social: "bg-rose",
  insight: "bg-lilac",
  snap: "bg-mint",
  task: "bg-yellow",
} as const;
export type KindTone = keyof typeof KIND_TONE;

/** A miniature feed card, as drawn on the landing page (not the real component). */
export function MiniCard({
  tone,
  kind,
  title,
  children,
  action = "Approve",
  className,
}: {
  tone: KindTone;
  kind: string;
  title: string;
  children?: ReactNode;
  action?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[22px] border border-line bg-surface shadow-card", className)}>
      <div className={cn("h-1.5", KIND_TONE[tone])} />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "typed rounded-full border-[1.5px] border-onpastel px-2 py-0.5 text-[9px] font-bold text-onpastel",
              KIND_TONE[tone],
            )}
          >
            {kind}
          </span>
          <span className="typed text-[9px] text-faint">agent · just now</span>
        </div>
        <p className="mt-2.5 font-display text-[19px] leading-[1.1] font-bold text-ink">{title}</p>
        {children && <div className="mt-2 text-[13px] leading-snug text-muted">{children}</div>}
        <div className="mt-3.5 flex items-center gap-1.5">
          <span className="rounded-full border-[1.5px] border-onpastel bg-yellow px-3 py-1 text-[12px] font-semibold text-onpastel shadow-[1.5px_1.5px_0_0_var(--color-onpastel)]">
            {action}
          </span>
          <span className="rounded-full border border-line bg-elevated px-2.5 py-1 text-[12px] text-ink">Edit</span>
          <span className="ml-auto rounded-full border border-line bg-elevated px-2.5 py-1 text-[12px] text-muted">
            Dive in
          </span>
        </div>
      </div>
    </div>
  );
}
