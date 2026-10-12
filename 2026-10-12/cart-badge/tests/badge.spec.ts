import { expect, test, type Page } from "@playwright/test";

const ISLAND = "**/_server-islands/UserBadge**";

async function withCookie(page: Page, sid?: string) {
  if (!sid) return;
  await page.context().addCookies([
    { name: "sid", value: sid, url: test.info().project.use.baseURL! },
  ]);
}

const badge = (page: Page) => page.locator("header");
// Astro strips slot="fallback" when it renders the fallback, so find it by class:
// before the island arrives, the fallback is the only .badge in the header.
const fallbackIn = (page: Page) => page.locator("header .badge").first();

test.describe("the cached page", () => {
  for (const sid of [undefined, "abc", "xyz"]) {
    test(`/product stays shared-cacheable and has no user data (sid=${sid})`, async ({ request }) => {
      const res = await request.get("/product", {
        headers: sid ? { cookie: `sid=${sid}` } : {},
      });
      expect(res.headers()["cache-control"]).toBe("public, s-maxage=3600");
      const body = await res.text();
      expect(body).not.toContain("Ada");
      expect(body).not.toContain("Grace");
    });
  }
});

test.describe("the island", () => {
  test("is never cacheable: private, no-store", async ({ page }) => {
    await withCookie(page, "abc");
    const island = page.waitForResponse(ISLAND);
    await page.goto("/product");
    const directives = ((await island).headers()["cache-control"] ?? "")
      .split(",")
      .map((d) => d.trim());

    expect(directives).toContain("private");
    expect(directives).toContain("no-store");
  });

  test("shows Ada's name and cart count", async ({ page }) => {
    await withCookie(page, "abc");
    await page.goto("/product");
    await expect(badge(page)).toContainText("Ada · 🛒 2");
  });

  test("shows Grace's name and cart count", async ({ page }) => {
    await withCookie(page, "xyz");
    await page.goto("/product");
    await expect(badge(page)).toContainText("Grace · 🛒 0");
  });

  for (const sid of [undefined, "expired"]) {
    test(`offers a real Sign in link without a session (sid=${sid})`, async ({ page }) => {
      await withCookie(page, sid);
      const island = page.waitForResponse(ISLAND);
      await page.goto("/product");
      await island;

      await expect(badge(page).getByRole("link", { name: "Sign in" })).toBeVisible();
      await expect(badge(page)).not.toContainText("<a");
    });
  }
});

test.describe("fallback", () => {
  for (const sid of [undefined, "abc"]) {
    test(`the swap doesn't move the heading (sid=${sid})`, async ({ page }) => {
      await withCookie(page, sid);
      // Hold the island back so the fallback state can be measured first.
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      await page.route(ISLAND, async (route) => {
        await held;
        await route.continue();
      });
      await page.goto("/product", { waitUntil: "domcontentloaded" });

      const fallback = fallbackIn(page);
      await expect(fallback).toBeVisible();
      const fallbackEl = await fallback.elementHandle();
      const h1Before = await page.locator("h1").boundingBox();
      const headerBefore = await page.locator("header").boundingBox();

      const island = page.waitForResponse(ISLAND);
      release();
      await island;
      await expect.poll(() => fallbackEl!.evaluate((el) => el.isConnected)).toBe(false);

      expect(await page.locator("header").boundingBox()).toEqual(headerBefore);
      expect(await page.locator("h1").boundingBox()).toEqual(h1Before);
    });
  }

  test("is useful without JavaScript and doesn't talk about JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/product");

    await expect(page.locator("h1")).toHaveText("Trail Shoe");
    const fallback = fallbackIn(page);
    await expect(fallback).toBeVisible();
    // The fallback is the only thing a no-JS user ever sees, so it must lead somewhere.
    await expect(
      page.locator("header a.badge, header .badge a").first(),
    ).toBeVisible();
    await expect(fallback).not.toContainText(/javascript/i);
    await context.close();
  });
});
