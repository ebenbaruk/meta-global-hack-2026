import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { Marquee } from "@/components/ui/Marquee";

const TICKER = [
  "Inbox read",
  "3 replies drafted",
  "Thursday conflict fixed",
  "Launch post ready",
  "Invoice logged",
  "Sales update written",
  "Huila reorder flagged",
  "Taste profile tuned",
  "Zero prompts typed",
];

const LINKS = [
  { href: "#insight", label: "Why a feed" },
  { href: "#how", label: "How it works" },
  { href: "#snap", label: "Snap" },
  { href: "#built", label: "Under the hood" },
];

export function Nav() {
  return (
    <header>
      <Marquee items={TICKER} speed={34} className="border-b-[1.5px] border-onpastel bg-lilac py-2.5 text-onpastel" />
      <nav className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Feedforward home">
          <Logo
            className="gap-1.5 [&>span:last-child]:text-[18px] min-[380px]:gap-2 min-[380px]:[&>span:last-child]:text-[20px] sm:[&>span:last-child]:text-[22px]"
            markClassName="size-8 min-[380px]:size-9"
          />
        </Link>
        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[15px] font-medium text-ink underline decoration-line-strong decoration-1 underline-offset-4 transition hover:decoration-lilac hover:decoration-2"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            className="inline-flex h-10 items-center rounded-full whitespace-nowrap border-[1.5px] border-onpastel bg-yellow px-3.5 text-[14px] min-[380px]:px-4 font-semibold text-onpastel shadow-[2px_2px_0_0_var(--color-onpastel)] transition hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Open app
          </Link>
        </div>
      </nav>
    </header>
  );
}
