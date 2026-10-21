import { expect, test } from "@playwright/test";

const words = ["café", "naïve", "日本語", "😀 party", "résumé", "plain"];
const expected = Array.from({ length: 300 }, (_, i) => `#${i + 1} ${words[(i + 1) % words.length]} #${i + 1}`);

test("fills the list progressively and ends with done: 300 events", async ({ page }) => {
  const statuses: string[] = [];
  await page.exposeFunction("recordStatus", (s: string) => statuses.push(s));
  await page.goto("/");
  await page.evaluate(() => {
    const el = document.querySelector("#status")!;
    new MutationObserver(() => (window as any).recordStatus(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  });

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator("#list li").first()).toBeVisible();
  // Rows arrive while the stream is still going, not all at once at the end.
  expect(await page.locator("#list li").count()).toBeLessThan(300);
  await expect(page.getByRole("status")).toHaveText(/^streaming… \d+ events$/);

  await expect(page.getByRole("status")).toHaveText("done: 300 events", { timeout: 20_000 });
  await expect(page.locator("#list li")).toHaveText(expected);
  expect(await page.locator("#list").textContent()).not.toContain("�");
  expect(statuses).toContain("streaming… 1 events");
});

test("Stop cancels the request, keeps the rows, and Start works again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator("#list li").nth(9)).toBeVisible();

  const failed = page.waitForEvent("requestfailed", (r) => r.url().includes("/api/events"));
  await page.getByRole("button", { name: "Stop" }).click();
  expect((await failed).failure()?.errorText).toContain("ERR_ABORTED");

  const rows = await page.locator("#list li").count();
  await expect(page.getByRole("status")).toHaveText(`stopped after ${rows} events`);
  await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled();

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toHaveText("done: 300 events", { timeout: 20_000 });
  await expect(page.locator("#list li")).toHaveCount(300);
});

test("shows the last event when the body has no trailing newline", async ({ page }) => {
  await page.goto("/?trailingNewline=0");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toHaveText("done: 300 events", { timeout: 20_000 });
  await expect(page.locator("#list li").last()).toHaveText(expected[299]);
});

test("shows the error and keeps the received rows when the connection drops", async ({ page }) => {
  await page.goto("/?fail=1");
  await page.getByRole("button", { name: "Start" }).click();
  const status = page.getByRole("status");
  await expect(status).toHaveAttribute("data-state", "error", { timeout: 20_000 });
  const rows = await page.locator("#list li").count();
  expect(rows).toBeGreaterThan(0);
  await expect(status).toHaveText(new RegExp(`^failed after ${rows} events: `));
});

test("names the HTTP status when the response fails", async ({ page }) => {
  await page.route("**/api/events*", (route) => route.fulfill({ status: 503, body: "" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toHaveText(/^failed after 0 events: Error: HTTP 503/);
});

test("keeps keyboard focus on a button and holds live announcements while streaming", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Stop" })).toBeFocused();
  await expect(page.getByRole("status")).toHaveAttribute("aria-busy", "true");

  await expect(page.locator("#list li").nth(4)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Start" })).toBeFocused();
  await expect(page.getByRole("status")).toHaveAttribute("aria-busy", "false");
});

test("logs nothing to the console", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", (m) => {
    if (!m.text().startsWith("[vite]")) logs.push(m.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toHaveText("done: 300 events", { timeout: 20_000 });
  expect(logs).toEqual([]);
});
