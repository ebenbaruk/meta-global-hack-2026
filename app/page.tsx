import Link from "next/link";

/** Landing page placeholder (being built). */
export default function Landing() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Link href="/app" className="font-display text-5xl font-black">
        Open Feedforward →
      </Link>
    </main>
  );
}
