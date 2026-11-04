import { cn } from "@/lib/cn";

/** The mark: a lilac card with a folded corner and a forward arrow, ink outlined. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <path
        d="M9 4.5h15.5L33 13v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3Z"
        fill="var(--color-lilac)"
        stroke="var(--color-onpastel)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24.5 4.5V13H33" fill="var(--color-yellow)" stroke="var(--color-onpastel)" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M13 27.5 24 16.5M16 16h8.5v8.5"
        fill="none"
        stroke="var(--color-onpastel)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + lowercase chunky serif wordmark. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[22px] leading-none font-black text-ink">feedforward</span>
    </span>
  );
}
