/**
 * Scripted demo run for the video. Drives the real app with Playwright and records it
 * frame by frame through the CDP screencast (crisper than recordVideo), logging a marker
 * at every scene start and around every wait we speed up in the edit.
 *
 *   pnpm tsx scripts/demo.ts [--url http://localhost:3130] [--pass landing,mobile,desktop]
 *
 * Passes: `landing` (the marketing page at /), `mobile` (the app full bleed, 390×844) and
 * `desktop` (the app inside its phone frame, with the context and the Agent Lens around it).
 * Output: video/out/capture/<pass>.mp4 + <pass>.json (markers in seconds from the first frame).
 */
import { chromium, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const ORIGIN = arg("url", "http://localhost:3130").replace(/\/(app)?\/?$/, "");
const APP = `${ORIGIN}/app`;
const PASS_LIST = arg("pass", "landing,mobile,desktop").split(",");
const OUT = "video/out/capture";

type Marker = { t: number; type: "scene" | "fast-start" | "fast-end" | "end"; id?: string };

const PASSES = {
  landing: { viewport: { width: 1440, height: 810 }, scale: 4 / 3 },
  mobile: { viewport: { width: 390, height: 844 }, scale: 2 },
  desktop: { viewport: { width: 1440, height: 810 }, scale: 4 / 3 },
} as const;
type PassName = keyof typeof PASSES;

/**
 * Maya's day starts in the morning: pick the fixed-offset zone where it is about 9 AM now,
 * so the app greets her with "Good morning" whatever time the video is rendered.
 */
function morningZone() {
  let offset = 9 - new Date().getUTCHours();
  if (offset > 12) offset -= 24;
  if (offset < -11) offset += 24;
  return offset === 0 ? "Etc/GMT" : offset > 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

/** A soft "finger" dot that follows the mouse, injected for the recording only (lilac, ink outlined). */
const CURSOR_SCRIPT = `
  window.addEventListener("DOMContentLoaded", () => {
    if (window.top !== window) return;
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;" +
      "background:rgba(217,168,255,.42);border:2px solid rgba(30,10,43,.8);box-shadow:0 4px 14px rgba(30,10,43,.25);" +
      "pointer-events:none;z-index:2147483647;opacity:0;transition:opacity .25s, transform .12s;";
    document.body.appendChild(dot);
    addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; dot.style.opacity = "1"; }, true);
    addEventListener("mousedown", () => { dot.style.transform = "scale(.78)"; dot.style.background = "rgba(217,168,255,.75)"; }, true);
    addEventListener("mouseup", () => { dot.style.transform = "scale(1)"; dot.style.background = "rgba(217,168,255,.42)"; }, true);
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

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    reducedMotion: "no-preference",
    colorScheme: "light",
    timezoneId: morningZone(),
  });
  await context.addInitScript(CURSOR_SCRIPT);
  await context.addInitScript(SCROLLER_SCRIPT);
  // Full-bleed mobile: leave room for the status bar and island the edit draws on the bezel.
  if (name === "mobile") await context.addInitScript(SAFE_TOP_SCRIPT);
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
  await page.evaluate(() => (document.documentElement.style.background = "#fff3e8"));
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

/** The app's scroll container: the phone screen on desktop, the window on mobile and the landing page. */
const SCROLLER_SCRIPT = `
  window.__scroller = () => {
    const el = document.querySelector("[data-scroll-root]");
    return el && getComputedStyle(el).overflowY !== "visible" ? el : document.scrollingElement;
  };
`;
const SAFE_TOP_SCRIPT = `
  window.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = '[data-testid="device-screen"] { --safe-top: 44px !important; }';
    document.head.appendChild(style);
  });
`;
type WithScroller = Window & { __scroller: () => Element };

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
    await this.page.goto(APP, { waitUntil: "domcontentloaded" });
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

  /** Puts the finger over the scroll container (the phone screen on desktop), so wheel events reach it. */
  async hoverScroller() {
    if ((this.page.viewportSize()?.width ?? 0) < 1024 || !(await this.page.getByTestId("device-screen").count())) return;
    const box = (await this.page.getByTestId("device-screen").boundingBox())!;
    await this.page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.55, { steps: 10 });
  }

  /** Smooth wheel scroll until the element's top sits just under the sticky app header (or `offset` px). */
  async scrollTo(loc: Locator, offset?: number, gain = 0.22) {
    await loc.waitFor();
    await this.hoverScroller();
    const target =
      offset ??
      (await this.page.evaluate(() => {
        const header = document.querySelector("[data-scroll-root] header") ?? document.querySelector("header");
        return (header?.getBoundingClientRect().bottom ?? 60) + 14;
      }));
    let last = NaN;
    let stuck = 0;
    for (let i = 0; i < 240; i++) {
      const top = await loc.evaluate((el) => el.getBoundingClientRect().top);
      const delta = top - target;
      if (Math.abs(delta) < 6) break;
      stuck = Math.abs(top - last) < 1 ? stuck + 1 : 0;
      if (stuck > 4) break; // the wheel is not reaching the scroller
      last = top;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), Math.max(18, Math.abs(delta) * gain));
      const atEdge = await this.page.evaluate((down) => {
        const el = (window as unknown as WithScroller).__scroller();
        return down ? el.scrollTop + el.clientHeight >= el.scrollHeight - 1 : el.scrollTop <= 0;
      }, delta > 0);
      if (atEdge) break;
      await this.page.mouse.wheel(0, step);
      await this.pause(24);
    }
    await this.pause(400);
  }

  /** A slow drift down, to read a tall card. */
  async drift(px: number, steps = 14) {
    await this.hoverScroller();
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, px / steps);
      await this.pause(30);
    }
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
  await run.page.getByTestId("feed-card").first().waitFor({ timeout: 120_000 });
  await run.page.getByTestId("skeleton-card").first().waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
  await nudge(run.page);
}

/** Headless Chromium sometimes stalls repainting after a load; a tiny scroll forces a fresh frame. */
async function nudge(page: Page) {
  for (const dy of [1, -1]) {
    await page.evaluate((d) => (window as unknown as WithScroller).__scroller().scrollBy(0, d), dy);
    await page.waitForTimeout(50);
  }
}

/** The marketing page: hero (with the live app in its phone), then a flip down to the models and the snap section. */
async function landingPass(run: Run) {
  const { page } = run;
  // Warm the app first: the hero's phone embeds /app, which then rehydrates this finished feed.
  await run.open();
  await feedReady(run);
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  await nudge(page);
  run.mark("scene", "landing");
  await run.pause(2600);
  await page.mouse.move(720, 420);
  // Land on the three model "cans", then on the snap photo with its real SAM outlines.
  await run.scrollTo(page.locator("#models"), -70, 0.24);
  await run.pause(2200);
  await run.scrollTo(page.locator("#snap"), -120, 0.24);
  await run.pause(2600);
}

async function mobilePass(run: Run) {
  const { page } = run;
  await run.open();
  await feedReady(run);
  await run.pause(800);

  run.mark("scene", "approve");
  const email = run.card("email_reply");
  await run.scrollTo(email);
  await run.pause(1800);
  await run.swipe(email, 1);
  await run.pause(1400);
  await run.tap(page.getByTestId("tab-outbox"));
  await page.getByTestId("outbox-item").first().waitFor();
  await run.pause(1800);
  await run.tap(page.getByTestId("tab-feed"));
  await run.pause(500);

  run.mark("scene", "sponsored");
  const sponsored = run.card("sponsored");
  await run.scrollTo(sponsored);
  await run.pause(1500);
  await run.tap(sponsored.getByTestId("why-btn"));
  await page.getByTestId("why-popover").waitFor();
  await run.pause(3000);
  await run.tap(sponsored.getByTestId("why-btn"));
  await run.pause(600);
  await run.swipe(sponsored, -1);
  await run.pause(1400);
}

async function desktopPass(run: Run) {
  const { page } = run;
  run.mark("scene", "intro");
  await run.open();
  await run.fast(() => feedReady(run), 4200);
  await run.pause(1200);
  // "Every call shows up on the right": the finger visits the Agent Lens, then comes back to the phone.
  await run.moveTo(page.getByTestId("agent-lens"), 0.5, 0.3);
  await run.pause(2200);
  await run.hoverScroller();
  await run.pause(600);

  run.mark("scene", "team");
  const team = run.card("team_update");
  await run.scrollTo(team);
  await run.pause(2600);
  await run.drift(220);
  await run.pause(2600);

  run.mark("scene", "image");
  const social = run.card("social_post");
  await run.scrollTo(social);
  await run.fast(() => social.locator("img").first().waitFor({ timeout: 120_000 }), 1500);
  await run.pause(2200);
  await run.drift(260, 16);
  await run.pause(2000);

  run.mark("scene", "snap");
  await run.tap(page.getByTestId("tab-snap"));
  await page.getByTestId("snap-sheet").waitFor();
  await run.pause(1800);
  await run.tap(page.getByTestId("snap-demo-invoice"));
  const snap = run.card("snap");
  await run.fast(() => snap.waitFor({ timeout: 120_000 }), 2500);
  await run.scrollTo(snap);
  await snap.locator("svg path").first().waitFor({ state: "attached" });
  await run.pause(3600);
  await run.drift(260);
  await run.pause(2200);

  run.mark("scene", "divein");
  const target = run.card("social_post");
  await run.scrollTo(target);
  await run.pause(900);
  await run.tap(target.getByTestId("divein-btn"));
  await page.getByTestId("chat-sheet").waitFor();
  await run.pause(1800);
  await run.tap(page.getByTestId("chat-chip").filter({ hasText: "Make it shorter" }));
  await run.fast(() => page.getByTestId("chat-apply").first().waitFor({ timeout: 120_000 }), 1200);
  await run.pause(2200);
  await run.tap(page.getByTestId("chat-apply").first());
  await run.pause(1500);
  await page.keyboard.press("Escape");
  await run.pause(400);
  await run.scrollTo(target);
  await run.pause(1800);

  run.mark("scene", "learn");
  // Bring the taste bars into view in the left column, so the viewer sees them move.
  const taste = page.getByTestId("taste-panel");
  await run.moveTo(taste, 0.5, 0.3);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 40);
    await run.pause(30);
  }
  await run.pause(500);
  // Two cards of the same kind if the feed has them, otherwise two that are not in the story.
  const kinds = await page.getByTestId("feed-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")!));
  const story = ["email_reply", "sponsored", "snap", "social_post", "team_update"];
  const dup = kinds.find((k, i) => !story.includes(k) && kinds.indexOf(k) !== i);
  const others = kinds.filter((k) => !story.includes(k));
  const picks = dup ? [dup, dup] : (others.length >= 2 ? others : kinds.filter((k) => k !== "email_reply")).slice(0, 2);
  for (const kind of picks) {
    const card = run.card(kind);
    await run.scrollTo(card);
    await run.pause(500);
    await run.tap(card.getByTestId("dismiss-btn"));
    await run.pause(1000);
  }
  await run.moveTo(taste, 0.5, 0.45);
  await run.pause(1500);

  run.mark("scene", "hood");
  // Night mode from the toggle in the left column, then approve: the Executor's call lands in the Lens.
  await run.tap(page.getByTestId("theme-toggle").first());
  await run.pause(1400);
  const email = run.card("email_reply");
  await run.scrollTo(email);
  await run.tap(email.getByTestId("approve-btn"));
  await run.pause(900);
  const lens = page.getByTestId("agent-lens");
  await run.moveTo(lens, 0.5, 0.2);
  await run.pause(1200);
  const rows = page.getByTestId("trace-row");
  const n = Math.min(await rows.count(), 4);
  for (let i = 0; i < n; i++) {
    await run.moveTo(rows.nth(i), 0.6, 0.5);
    await run.pause(600);
  }
  await run.pause(3000);
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  if (PASS_LIST.includes("landing")) await record("landing", landingPass);
  if (PASS_LIST.includes("mobile")) await record("mobile", mobilePass);
  if (PASS_LIST.includes("desktop")) await record("desktop", desktopPass);
})();
