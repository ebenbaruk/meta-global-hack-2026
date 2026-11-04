/** Renders the HTML slides and overlays in video/slides/ to PNGs in video/out/slides/. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { CHIP_SPEEDS, SCENES } from "./video-scenes";

const OUT = "video/out/slides";
const base = `file://${resolve("video/slides")}`;

(async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const shot = async (url: string, file: string, transparent = false) => {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/${file}.png`, omitBackground: transparent });
    console.log(`slide ${file}`);
  };

  for (const s of ["title", "problem", "architecture", "closing", "stage"]) await shot(`${base}/${s}.html`, s);
  await shot(`${base}/bezel.html`, "bezel", true);

  let n = 0;
  for (const scene of SCENES.filter((s) => s.source === "mobile" && s.caption)) {
    const q = new URLSearchParams({ num: String(++n).padStart(2, "0"), title: scene.caption!.title, tag: scene.caption!.tag ?? "" });
    await shot(`${base}/caption.html?${q}`, `caption-${scene.id}`, true);
  }
  for (const x of CHIP_SPEEDS) await shot(`${base}/chip.html?x=${x}×`, `chip-${x}`, true);

  await page.setViewportSize({ width: 444, height: 960 });
  await shot(`${base}/mask.html`, "mask");
  await browser.close();
})();
