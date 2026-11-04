/**
 * Scripted demo run for the video. Drives the real app with Playwright and records it
 * frame by frame through the CDP screencast (crisper than recordVideo), logging a marker
 * at every scene start and around every wait we speed up in the edit.
 *
 *   pnpm tsx scripts/demo.ts [--url http://localhost:3130] [--pass mobile|desktop|both]
 *
 * Output: video/out/capture/<pass>.mp4 + <pass>.json (markers in seconds from the first frame).
 */
import { chromium, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const URL = arg("url", "http://localhost:3130");
const PASS = arg("pass", "both");
const OUT = "video/out/capture";

type Marker = { t: number; type: "scene" | "fast-start" | "fast-end" | "end"; id?: string };

const PASSES = {
  mobile: { viewport: { width: 390, height: 844 }, scale: 2 },
  desktop: { viewport: { width: 1440, height: 810 }, scale: 4 / 3 },
} as const;
type PassName = keyof typeof PASSES;

/** A soft "finger" dot that follows the mouse, injected for the recording only. */
const CURSOR_SCRIPT = `
  window.addEventListener("DOMContentLoaded", () => {
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;" +
      "background:rgba(255,255,255,.22);border:1.5px solid rgba(255,255,255,.55);box-shadow:0 4px 18px rgba(0,0,0,.45);" +
      "pointer-events:none;z-index:2147483647;opacity:0;transition:opacity .25s, transform .12s;";
    document.body.appendChild(dot);
    addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; dot.style.opacity = "1"; }, true);
    addEventListener("mousedown", () => { dot.style.transform = "scale(.78)"; dot.style.background = "rgba(255,255,255,.34)"; }, true);
    addEventListener("mouseup", () => { dot.style.transform = "scale(1)"; dot.style.background = "rgba(255,255,255,.22)"; }, true);
    window.__hideCursor = () => { dot.style.opacity = "0"; };
  });
`;

async function record(name: PassName, run: (r: Run) => Promise<void>) {
  const { viewport, scale } = PASSES[name];
  // Without this flag the headless screencast ignores deviceScaleFactor and sends CSS-pixel frames.
  const browser = await chromium.launch({ args: [`--force-device-scale-factor=${scale}`] });
  const dir = `${OUT}/${name}-frames`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: "no-preference" });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  const cdp = await context.newCDPSession(page);
  const frames: { file: string; t: number }[] = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = `${dir}/${String(frames.length).padStart(6, "0")}.jpg`;
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp ?? Date.now() / 1000 });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });

  const markers: Marker[] = [];
  const mark = (type: Marker["type"], id?: string) => {
    markers.push({ t: Date.now() / 1000, type, id });
    console.log(`[${name}] ${type}${id ? ` ${id}` : ""}`);
  };

  await page.goto("about:blank");
  await page.evaluate(() => (document.documentElement.style.background = "#07080b"));
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: Math.round(viewport.width * scale),
    maxHeight: Math.round(viewport.height * scale),
    everyNthFrame: 1,
  });
  await page.waitForTimeout(500);

  await run(new Run(page, mark));
  mark("end");
  await page.waitForTimeout(300);
  await cdp.send("Page.stopScreencast");
  await page.waitForTimeout(300);
  await context.close();
  await browser.close();

  // Frames arrive only when the page repaints: hold each one until the next (variable frame rate → 30 fps).
  const t0 = frames[0].t;
  const end = markers.at(-1)!.t;
  const list = frames
    .map((f, i) => `file '${f.file.split("/").pop()}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`)
    .join("\n");
  writeFileSync(`${dir}/list.txt`, `ffconcat version 1.0\n${list}\nfile '${frames.at(-1)!.file.split("/").pop()}'\n`);
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", `${dir}/list.txt`,
    "-vf", `fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "14", `${OUT}/${name}.mp4`,
  ], { stdio: "inherit" });
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(markers.map((m) => ({ ...m, t: +(m.t - t0).toFixed(3) })), null, 2));
  rmSync(dir, { recursive: true, force: true });
  console.log(`[${name}] ${frames.length} frames, ${(end - t0).toFixed(1)} s, console errors: ${errors.length}`);
  errors.forEach((e) => console.log(`  console error: ${e}`));
}

/** Readable, human-paced interactions. */
class Run {
  constructor(
    readonly page: Page,
    readonly mark: (type: Marker["type"], id?: string) => void,
  ) {}

  pause = (ms: number) => this.page.waitForTimeout(ms);
  card = (kind: string) => this.page.locator(`[data-testid="feed-card"][data-kind="${kind}"]`).first();

  /** Waits for something slow (model calls), flagged so the edit speeds it up. */
  async fast(wait: () => Promise<unknown>, lead = 1200) {
    await this.pause(lead);
    this.mark("fast-start");
    await wait();
    this.mark("fast-end");
  }

  /** Fresh context, so a plain load is a clean demo state (no reload, no wasted API calls). */
  async open() {
    await this.page.goto(URL, { waitUntil: "domcontentloaded" });
    await this.page.getByTestId("feed").waitFor().catch(() => {});
    await nudge(this.page);
  }

  async moveTo(loc: Locator, dx = 0.5, dy = 0.5) {
    const box = (await loc.boundingBox())!;
    await this.page.mouse.move(box.x + box.width * dx, box.y + box.height * dy, { steps: 14 });
  }

  async tap(loc: Locator) {
    await loc.scrollIntoViewIfNeeded();
    await this.moveTo(loc);
    await this.pause(250);
    await this.page.mouse.down();
    await this.pause(90);
    await this.page.mouse.up();
  }

  /** Smooth wheel scroll until the element's top sits `offset` px below the viewport top. */
  async scrollTo(loc: Locator, offset = 76) {
    await loc.waitFor();
    for (let i = 0; i < 200; i++) {
      const top = await loc.evaluate((el) => el.getBoundingClientRect().top);
      const delta = top - offset;
      if (Math.abs(delta) < 6) break;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), Math.max(14, Math.abs(delta) * 0.16));
      const atEdge = await this.page.evaluate(
        (down) => (down ? scrollY + innerHeight >= document.documentElement.scrollHeight - 1 : scrollY <= 0),
        delta > 0,
      );
      if (atEdge) break;
      await this.page.mouse.wheel(0, step);
      await this.pause(24);
    }
    await this.pause(400);
  }

  /** Physical swipe on the card header (the action bar swallows pointer events). */
  async swipe(loc: Locator, dir: 1 | -1) {
    const box = (await loc.boundingBox())!;
    const x = box.x + box.width * 0.5;
    const y = box.y + 70;
    await this.page.mouse.move(x, y, { steps: 12 });
    await this.pause(300);
    await this.page.mouse.down();
    for (let i = 1; i <= 24; i++) {
      await this.page.mouse.move(x + dir * i * 11, y + i * 0.6);
      await this.pause(18);
    }
    await this.pause(120);
    await this.page.mouse.up();
  }
}

async function feedReady(run: Run) {
  await run.page.getByTestId("feed-card").first().waitFor({ timeout: 90_000 });
  await run.page.getByTestId("skeleton-card").first().waitFor({ state: "detached", timeout: 90_000 }).catch(() => {});
  await nudge(run.page);
}

/** Headless Chromium sometimes stalls repainting after a load; a tiny scroll forces a fresh frame. */
async function nudge(page: Page) {
  await page.evaluate(() => window.scrollBy(0, 1));
  await page.waitForTimeout(50);
  await page.evaluate(() => window.scrollBy(0, -1));
}

async function mobilePass(run: Run) {
  const { page } = run;
  const viewH = PASSES.mobile.viewport.height;

  await run.open();
  run.mark("scene", "intro");
  await run.fast(() => feedReady(run), 4500);
  await run.pause(1800);

  run.mark("scene", "approve");
  const email = run.card("email_reply");
  await run.scrollTo(email);
  await run.pause(2600);
  await run.swipe(email, 1);
  await run.pause(1600);
  await run.tap(page.getByTestId("tab-outbox"));
  await page.getByTestId("outbox-item").first().waitFor();
  await run.pause(2200);
  await run.tap(page.getByTestId("tab-feed"));
  await run.pause(900);

  run.mark("scene", "team");
  const team = run.card("team_update");
  await run.scrollTo(team);
  await run.pause(2500);
  await page.mouse.wheel(0, 0); // keep the cursor still while reading
  const teamBox = (await team.boundingBox())!;
  if (teamBox.height > viewH - 160) {
    await page.mouse.move(195, 500);
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, Math.min(16, (teamBox.height - viewH + 200) / 14));
      await run.pause(30);
    }
  }
  await run.pause(2400);

  run.mark("scene", "image");
  const social = run.card("social_post");
  await run.scrollTo(social);
  await run.fast(() => social.locator("img").first().waitFor({ timeout: 90_000 }), 1500);
  await run.pause(2200);
  for (let i = 0; i < 16; i++) {
    await page.mouse.wheel(0, 18);
    await run.pause(30);
  }
  await run.pause(2000);

  run.mark("scene", "snap");
  await run.tap(page.getByTestId("tab-snap"));
  await page.getByTestId("snap-sheet").waitFor();
  await run.pause(1800);
  await run.tap(page.getByTestId("snap-demo-invoice"));
  const snap = run.card("snap");
  await run.fast(() => snap.waitFor({ timeout: 90_000 }), 2500);
  await run.scrollTo(snap);
  await snap.locator("svg path").first().waitFor({ state: "attached" });
  await run.pause(4500);
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 20);
    await run.pause(30);
  }
  await run.pause(2200);

  run.mark("scene", "sponsored");
  const sponsored = run.card("sponsored");
  await run.scrollTo(sponsored);
  await run.pause(2400);
  await run.tap(sponsored.getByTestId("why-btn"));
  await page.getByTestId("why-popover").waitFor();
  await run.pause(4200);
  await run.tap(sponsored.getByTestId("why-btn"));
  await run.pause(1200);

  run.mark("scene", "divein");
  const target = run.card("social_post");
  await run.scrollTo(target);
  await run.pause(900);
  await run.tap(target.getByTestId("divein-btn"));
  await page.getByTestId("chat-sheet").waitFor();
  await run.pause(2400);
  await run.tap(page.getByTestId("chat-chip").filter({ hasText: "Make it shorter" }));
  await run.fast(() => page.getByTestId("chat-apply").waitFor({ timeout: 90_000 }), 1200);
  await run.pause(2600);
  await run.tap(page.getByTestId("chat-apply"));
  await run.pause(1800);
  await page.keyboard.press("Escape");
  await run.pause(400);
  await run.scrollTo(target);
  await run.pause(2400);
}

async function desktopPass(run: Run) {
  const { page } = run;
  await run.open();
  await feedReady(run);
  await page.waitForTimeout(1500);
  await page.mouse.move(960, 540);

  run.mark("scene", "learn");
  await run.pause(1200);
  // Two cards of the same kind if the feed has them, otherwise the first two non-email cards.
  const kinds = await page.getByTestId("feed-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")!));
  const dup = kinds.find((k, i) => k !== "email_reply" && k !== "sponsored" && kinds.indexOf(k) !== i);
  const picks = dup ? [dup, dup] : kinds.filter((k) => !["email_reply", "sponsored", "snap"].includes(k)).slice(0, 2);
  for (const kind of picks) {
    const card = run.card(kind);
    await run.scrollTo(card, 120);
    await run.pause(900);
    await run.tap(card.getByTestId("dismiss-btn"));
    await run.pause(2600);
  }
  await run.pause(1500);

  run.mark("scene", "hood");
  await run.scrollTo(page.getByTestId("feed-card").first(), 120);
  const lens = page.getByTestId("agent-lens");
  await run.moveTo(lens, 0.5, 0.25);
  await run.pause(1500);
  const rows = page.getByTestId("trace-row");
  const n = Math.min(await rows.count(), 6);
  for (let i = 0; i < n; i++) {
    await run.moveTo(rows.nth(i), 0.6, 0.5);
    await run.pause(700);
  }
  await run.pause(1500);
  await run.tap(run.card("email_reply").getByTestId("approve-btn"));
  await run.moveTo(lens, 0.5, 0.2);
  await run.pause(4500);
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  if (PASS === "mobile" || PASS === "both") await record("mobile", mobilePass);
  if (PASS === "desktop" || PASS === "both") await record("desktop", desktopPass);
})();
