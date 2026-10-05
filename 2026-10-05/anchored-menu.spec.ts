import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

// `npm run test:before-review` runs the same checks against the original solution.
const pagePath = resolve(import.meta.dirname, process.env.PAGE ?? "index.html");
const pageUrl = pathToFileURL(pagePath).href;

const row = (page: Page, n: number) => page.locator(".rows > li").nth(n - 1);
const trigger = (page: Page, n: number) => row(page, n).locator(".actions-btn");
const menu = (page: Page, n: number) => row(page, n).locator(".menu");

async function settled(menu: Locator) {
  await menu.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );
}

async function boxes(page: Page, n: number) {
  await settled(menu(page, n));
  const button = (await trigger(page, n).boundingBox())!;
  const popup = (await menu(page, n).boundingBox())!;
  return { button, popup };
}

async function open(page: Page, n: number) {
  await trigger(page, n).scrollIntoViewIfNeeded();
  await trigger(page, n).click();
  await expect(menu(page, n)).toBeVisible();
  return boxes(page, n);
}

const openMenus = (page: Page) =>
  page.locator(".menu").evaluateAll(
    (menus) => menus.filter((m) => m.matches(":popover-open")).length,
  );

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(pageUrl);
});

test.describe("opening and closing", () => {
  test("uses no JavaScript", async ({ page }) => {
    await expect(page.locator("script")).toHaveCount(0);
  });

  test("row 3 opens only its own menu", async ({ page }) => {
    await open(page, 3);

    expect(await openMenus(page)).toBe(1);
    expect(await menu(page, 3).evaluate((el) => el.matches(":popover-open"))).toBe(true);
  });

  test("opening another row's menu closes the first", async ({ page }) => {
    await open(page, 3);
    // Row 3's open menu covers rows 4–6, so pick a row it doesn't cover.
    await open(page, 10);

    await expect(menu(page, 3)).toBeHidden();
    expect(await openMenus(page)).toBe(1);
  });

  test("Esc closes the menu and focus returns to the trigger", async ({ page }) => {
    await open(page, 3);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");

    await expect(menu(page, 3)).toBeHidden();
    await expect(trigger(page, 3)).toBeFocused();
  });

  test("clicking elsewhere closes the menu", async ({ page }) => {
    await open(page, 3);
    await page.locator("h1").click();

    await expect(menu(page, 3)).toBeHidden();
  });

  test("the menu escapes an ancestor with overflow: hidden", async ({ page }) => {
    await page.addStyleTag({ content: ".rows { overflow: hidden; height: 150px; }" });
    const { popup } = await open(page, 1);

    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest(".menu")?.id ?? null,
      [popup.x + popup.width / 2, popup.y + popup.height - 4],
    );
    expect(hit).toBe(await menu(page, 1).getAttribute("id"));
  });
});

test.describe("positioning", () => {
  test("opens directly below its button: left edges aligned, 8px gap", async ({ page }) => {
    for (const n of [1, 3]) {
      const { button, popup } = await open(page, n);

      expect(popup.y - (button.y + button.height)).toBeCloseTo(8, 0);
      expect(popup.x).toBeCloseTo(button.x, 0);
      await page.keyboard.press("Escape");
    }
  });

  test("stays below while there is room, even in the lower half", async ({ page }) => {
    // The first row whose button sits in the lower half but still has room below.
    const rows = await page.locator(".rows > li").count();
    let n = 0;
    for (let i = 1; i <= rows; i++) {
      const y = (await trigger(page, i).boundingBox())!.y;
      if (y > 380 && y < 480) {
        n = i;
        break;
      }
    }
    expect(n).toBeGreaterThan(0);

    await trigger(page, n).click();
    const { button, popup } = await boxes(page, n);
    expect(popup.y).toBeGreaterThan(button.y);
  });

  test("flips above at the bottom edge, unclipped, and back when it no longer fits", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 400 });
    const n = 15;
    await trigger(page, n).evaluate((el) => el.scrollIntoView({ block: "end" }));
    await trigger(page, n).click();
    let { button, popup } = await boxes(page, n);

    expect(button.y - (popup.y + popup.height)).toBeCloseTo(8, 0);
    expect(popup.x).toBeCloseTo(button.x, 0);
    expect(popup.y).toBeGreaterThanOrEqual(0);

    // Chromium keeps the last successful fallback while it still fits, so the menu
    // only flips back once there's no room above: scroll the button to the top.
    await trigger(page, n).evaluate((el) => el.scrollIntoView({ block: "start" }));
    ({ button, popup } = await boxes(page, n));
    expect(popup.y - (button.y + button.height)).toBeCloseTo(8, 0);
  });

  test("flips horizontally when the button is at the right edge", async ({ page }) => {
    await page.addStyleTag({
      content: ".rows > li:nth-child(3) { display: flex; justify-content: flex-end; }",
    });
    const { button, popup } = await open(page, 3);

    expect(popup.x + popup.width).toBeLessThanOrEqual(1000);
    expect(popup.x + popup.width).toBeCloseTo(button.x + button.width, 0);
  });

  test("guards anchor positioning with @supports", () => {
    // Chromium blocks CSSOM access to file:// stylesheets, so read the file.
    const css = readFileSync(resolve(dirname(pagePath), "index.css"), "utf8");

    expect(css).toMatch(/@supports\s*\(\s*anchor-name\s*:/);
  });
});

test.describe("animation", () => {
  const transitioned = (menu: Locator) =>
    menu.evaluate((el) =>
      el.getAnimations().map((a) => (a as CSSTransition).transitionProperty),
    );

  test("fades and slides in on open, and out on close", async ({ page }) => {
    await trigger(page, 3).click();
    const entry = await transitioned(menu(page, 3));
    expect(entry).toContain("opacity");
    expect(entry.some((p) => p === "translate" || p === "transform")).toBe(true);

    await settled(menu(page, 3));
    await page.keyboard.press("Escape");
    expect(await transitioned(menu(page, 3))).toContain("opacity");
  });

  test("doesn't move under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger(page, 3).click();

    const entry = await transitioned(menu(page, 3));
    expect(entry.some((p) => p === "translate" || p === "transform")).toBe(false);
  });
});

test.describe("semantics", () => {
  test("each trigger names its row and exposes the open state", async ({ page }) => {
    // popovertarget exposes expanded natively, without aria-expanded. Playwright's
    // `expanded` filter only reads the attribute, so ask Chromium's a11y tree.
    const cdp = await page.context().newCDPSession(page);
    const expanded = async () => {
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      const node = nodes.find(
        (n) => n.role?.value === "button" && n.name?.value === "Actions for INV-1003",
      );
      return node?.properties?.find((p) => p.name === "expanded")?.value.value;
    };
    const button = page.getByRole("button", { name: "Actions for INV-1003" });

    await expect(button).toBeVisible();
    expect(await expanded()).toBe(false);
    await button.click();
    expect(await expanded()).toBe(true);
  });

  test("the open menu is a named group of buttons", async ({ page }) => {
    await open(page, 3);

    const group = page.getByRole("group", { name: "Actions for INV-1003" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("button")).toHaveText([
      "Download PDF",
      "Send reminder",
      "Void invoice",
    ]);
  });
});
