import { expect, test, type Page } from "@playwright/test";

/** Mock mode (META_MOCK=1): the full user journey from SPEC §9. */

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await page.goto("/app");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

const readyCards = (page: Page) => page.getByTestId("feed-card");

async function waitForFeed(page: Page) {
  await expect(readyCards(page).first()).toBeVisible();
  await expect(page.getByTestId("skeleton-card")).toHaveCount(0, { timeout: 30_000 });
}

test("feed materializes with prepared cards of several kinds", async ({ page }) => {
  await waitForFeed(page);
  const kinds = await readyCards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
  expect(kinds.length).toBeGreaterThanOrEqual(5);
  expect(new Set(kinds).size).toBeGreaterThanOrEqual(4);
  expect(kinds).toContain("sponsored");
});

test("approve sends the action and it lands in the outbox", async ({ page }) => {
  await waitForFeed(page);
  const card = page.locator('[data-testid="feed-card"][data-kind="email_reply"]').first();
  const id = await card.getAttribute("data-id");
  await card.getByTestId("approve-btn").click();
  await expect(page.locator(`[data-testid="feed-card"][data-id="${id}"]`)).toHaveCount(0);
  await expect(page.getByTestId("toast").first()).toBeVisible();
  await page.getByTestId("tab-outbox").click();
  await expect(page.getByTestId("outbox-item").first()).toBeVisible();
});

test("dismissing twice retunes the feed", async ({ page }) => {
  await waitForFeed(page);
  for (let i = 0; i < 2; i++) {
    await readyCards(page).first().getByTestId("dismiss-btn").click();
    await page.waitForTimeout(400);
  }
  await expect(page.getByTestId("toast").filter({ hasText: /tuned/i }).first()).toBeVisible();
});

test("sponsored card explains itself", async ({ page }) => {
  await waitForFeed(page);
  const sponsored = page.locator('[data-testid="feed-card"][data-kind="sponsored"]').first();
  await sponsored.scrollIntoViewIfNeeded();
  await sponsored.getByTestId("why-btn").click();
  await expect(page.getByText(/your plans/i).first()).toBeVisible();
});

test("dive in streams a reply", async ({ page }) => {
  await waitForFeed(page);
  await readyCards(page).first().getByTestId("divein-btn").click();
  await expect(page.getByTestId("chat-sheet")).toBeVisible();
  await page.getByTestId("chat-input").fill("Why is this in my feed?");
  await page.getByTestId("chat-send").click();
  await expect(page.locator('[data-testid="chat-message"][data-role="assistant"]').last()).toContainText(/\w{3,}/);
});

test("snap a demo photo turns into a card with SAM outlines", async ({ page }) => {
  await waitForFeed(page);
  await page.getByTestId("tab-snap").click();
  await expect(page.getByTestId("snap-sheet")).toBeVisible();
  await page.getByTestId("snap-demo-invoice").click();
  const snap = page.locator('[data-testid="feed-card"][data-kind="snap"]').first();
  await expect(snap).toBeVisible({ timeout: 30_000 });
  await expect(snap.locator("svg path").first()).toBeAttached();
});

test("theme toggle switches Oat and Night", async ({ page }) => {
  await waitForFeed(page);
  const html = page.locator("html");
  const toggle = page.getByTestId("theme-toggle").last();
  await toggle.click();
  const first = await html.getAttribute("data-theme");
  await toggle.click();
  await expect(html).not.toHaveAttribute("data-theme", first ?? "");
});

test("desktop renders the app inside the phone, sheets included", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the device frame is desktop only");
  await waitForFeed(page);
  const screen = (await page.getByTestId("device-screen").boundingBox())!;
  await page.getByTestId("tab-snap").click();
  await expect(page.getByTestId("snap-sheet")).toBeVisible();
  await page.waitForTimeout(600);
  const sheet = (await page.getByTestId("snap-sheet").boundingBox())!;
  expect(sheet.x).toBeGreaterThanOrEqual(screen.x - 1);
  expect(sheet.x + sheet.width).toBeLessThanOrEqual(screen.x + screen.width + 1);
  expect(sheet.y + sheet.height).toBeLessThanOrEqual(screen.y + screen.height + 1);
});
