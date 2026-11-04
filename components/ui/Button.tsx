import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  /** Yellow pill with an ink drop shadow; pressing it sinks into the shadow. */
  primary:
    "bg-yellow text-onpastel border-[1.5px] border-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-y-px",
  secondary: "bg-transparent text-ink border-[1.5px] border-line-strong hover:bg-elevated",
  ghost: "bg-elevated text-ink border border-line hover:border-line-strong",
};

/** The pill button of the design system. */
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[transform,box-shadow,background-color] duration-150 disabled:pointer-events-none disabled:opacity-50",
          VARIANTS[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
