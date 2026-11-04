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
  const shot = async (url: string, file: string, transparent = false, crop?: string) => {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    // `crop`: only the element (plus room for its drop shadow), for overlays the edit positions itself.
    const box = crop ? await page.locator(crop).boundingBox() : null;
    const clip = box ? { x: 0, y: 0, width: Math.ceil(box.x + box.width + 10), height: Math.ceil(box.y + box.height + 10) } : undefined;
    await page.screenshot({ path: `${OUT}/${file}.png`, omitBackground: transparent, clip });
    console.log(`slide ${file}`);
  };

  for (const s of ["title", "problem", "architecture", "closing", "stage"]) await shot(`${base}/${s}.html`, s);
  await shot(`${base}/bezel.html`, "bezel", true);

  for (const scene of SCENES.filter((s) => s.source === "mobile" && s.caption)) {
    const q = new URLSearchParams({ num: "On her phone", title: scene.caption!.title, tag: scene.caption!.tag ?? "" });
    await shot(`${base}/caption.html?${q}`, `caption-${scene.id}`, true);
  }
  for (const x of CHIP_SPEEDS) await shot(`${base}/chip.html?x=${x}×`, `chip-${x}`, true, "#chip");

  await page.setViewportSize({ width: 444, height: 960 });
  await shot(`${base}/mask.html`, "mask");
  await browser.close();
})();
