import { readFile } from "node:fs/promises";
import path from "node:path";
import { BuiltRight } from "@/components/landing/BuiltRight";
import { Closing } from "@/components/landing/Closing";
import { Gestures } from "@/components/landing/Gestures";
import { Hero } from "@/components/landing/Hero";
import { Insight } from "@/components/landing/Insight";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { Maya } from "@/components/landing/Maya";
import { Models } from "@/components/landing/Models";
import { Nav } from "@/components/landing/Nav";
import { Pipeline } from "@/components/landing/Pipeline";
import { Snap, type Outline } from "@/components/landing/Snap";
import { parseSam } from "@/lib/sam";

export const dynamic = "force-static";

/** The largest SAM 3.1 mask per phrase, from raw outputs recorded on the demo invoice photo. */
async function demoOutlines(): Promise<Outline[]> {
  const phrases = [
    ["paper", "Invoice"],
    ["sack", "Green coffee sack"],
    ["scoop", "Scoop"],
  ] as const;
  const outlines = await Promise.all(
    phrases.map(async ([phrase, label]): Promise<Outline | null> => {
      try {
        const raw = await readFile(path.join(process.cwd(), "tests/fixtures", `sam-${phrase}.txt`), "utf8");
        const objects = await parseSam(raw, label);
        const area = (o: (typeof objects)[number]) => (o.box.x2 - o.box.x1) * (o.box.y2 - o.box.y1);
        const biggest = objects.sort((a, b) => area(b) - area(a))[0];
        return biggest ? ({ label, d: biggest.svgPath, box: biggest.box } satisfies Outline) : null;
      } catch {
        return null;
      }
    }),
  );
  return outlines.filter((o): o is Outline => o !== null);
}

export default async function Landing() {
  const outlines = await demoOutlines();
  return (
    <LandingMotion>
      <Nav />
      <main>
        <Hero />
        <Insight />
        <Maya />
        <Pipeline />
        <Models />
        <Gestures />
        <Snap outlines={outlines} />
        <BuiltRight />
      </main>
      <Closing />
    </LandingMotion>
  );
}
