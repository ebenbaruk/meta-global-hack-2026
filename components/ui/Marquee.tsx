import { cn } from "@/lib/cn";

/** Infinite ticker of typed labels separated by a ✺ glyph. Content is doubled for a seamless loop. */
export function Marquee({ items, className, speed = 28 }: { items: string[]; className?: string; speed?: number }) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={i} className="typed flex items-center gap-4 pr-4 text-[11px] font-bold whitespace-nowrap">
          <span aria-hidden>✺</span>
          {t}
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("flex overflow-hidden", className)}>
      <div className="flex animate-marquee motion-reduce:animate-none" style={{ animationDuration: `${speed}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
