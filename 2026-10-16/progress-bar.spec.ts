import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = resolve(here, process.env.PAGE ?? "index.html");
const pageUrl = "file:///" + pagePath.replace(/\\/g, "/");
const source = readFileSync(pagePath, "utf8");
const css = source.match(/<style>([\s\S]*?)<\/style>/)![1];

/** scaleX of .progress read from its computed transform matrix. */
async function scale(page: Page): Promise<number> {
  return page.locator(".progress").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    return t === "none" ? 1 : new DOMMatrixReadOnly(t).a;
  });
}

async function scrollToFraction(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTo(0, max * f);
  }, fraction);
  // Scroll timelines update on the next frame.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** The page's own markup with a transform applied, loaded inline (no file:// differences matter here). */
async function loadVariant(page: Page, edit: (html: string) => string) {
  await page.setContent(edit(source));
}

const paragraph = /<p>[\s\S]*?<\/p>/g;

test.describe("layout", () => {
  test("fixed to the top, full width, ~4px tall", async ({ page }) => {
    await page.goto(pageUrl);
    const style = await page.locator(".progress").evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, top: s.top, left: s.left, width: s.width, height: s.height };
    });
    expect(style).toEqual({ position: "fixed", top: "0px", left: "0px", width: "1280px", height: "4px" });
  });

  test("colour is clearly visible against the page (>= 3:1)", async ({ page }) => {
    await page.goto(pageUrl);
    const ratio = await page.evaluate(() => {
      const rgb = (c: string) => c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const bar = lum(rgb(getComputedStyle(document.querySelector(".progress")!).backgroundColor));
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const page = bodyBg === "rgba(0, 0, 0, 0)" ? 1 : lum(rgb(bodyBg));
      const [hi, lo] = bar > page ? [bar, page] : [page, bar];
      return (hi + 0.05) / (lo + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test("stays above a sticky header", async ({ page }) => {
    await loadVariant(page, (html) =>
      html.replace("<h1>", '<header style="position: sticky; top: 0; height: 3rem; background: white">Site</header><h1>'),
    );
    await scrollToFraction(page, 1);
    // Hit-testing follows paint order; re-enable pointer events so the probe can see the bar.
    const hit = await page.evaluate(() => {
      document.querySelector<HTMLElement>(".progress")!.style.pointerEvents = "auto";
      return document.elementFromPoint(640, 2)?.className;
    });
    expect(hit).toBe("progress");
  });
});

test.describe("scroll progress", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(pageUrl);
  });

  test("the page scrolls by several viewports", async ({ page }) => {
    const range = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    expect(range).toBeGreaterThan(720 * 2);
  });

  test("empty at the top, ~50% halfway, exactly full at the bottom", async ({ page }) => {
    expect(await scale(page)).toBe(0);
    await scrollToFraction(page, 0.5);
    expect(await scale(page)).toBeCloseTo(0.5, 2);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await expect
      .poll(() => page.locator(".progress").evaluate((el) => getComputedStyle(el).transform))
      .toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  test("tracks scroll linearly (no easing)", async ({ page }) => {
    for (const f of [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]) {
      await scrollToFraction(page, f);
      expect(await scale(page)).toBeCloseTo(f, 2);
    }
  });

  test("grows from the left edge", async ({ page }) => {
    await scrollToFraction(page, 0.5);
    const box = await page.locator(".progress").boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.width).toBeCloseTo(640, -1);
  });

  test("shrinks again when scrolling back up", async ({ page }) => {
    await scrollToFraction(page, 1);
    expect(await scale(page)).toBe(1);
    await scrollToFraction(page, 0.3);
    expect(await scale(page)).toBeCloseTo(0.3, 2);
    await scrollToFraction(page, 0);
    expect(await scale(page)).toBe(0);
  });

  test("adapts to resizing and added content without CSS changes", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 600 });
    await scrollToFraction(page, 0.5);
    expect(await scale(page)).toBeCloseTo(0.5, 2);

    await page.evaluate(() => {
      const p = document.querySelector("p")!;
      for (let i = 0; i < 40; i++) document.body.append(p.cloneNode(true));
    });
    await scrollToFraction(page, 0.25);
    expect(await scale(page)).toBeCloseTo(0.25, 2);
  });
});

test.describe("edge cases", () => {
  test("a page shorter than the viewport shows an empty bar, not a full one", async ({ page }) => {
    await loadVariant(page, (html) => html.replace(paragraph, ""));
    const state = await page.evaluate(() => ({
      range: document.documentElement.scrollHeight - innerHeight,
      transform: getComputedStyle(document.querySelector(".progress")!).transform,
    }));
    expect(state.range).toBeLessThanOrEqual(0);
    expect(state.transform).toBe("matrix(0, 0, 0, 1, 0, 0)");
  });

  test("without scroll-timeline support the bar is hidden", async ({ page }) => {
    await loadVariant(page, (html) =>
      html.replace("@supports (animation-timeline: scroll())", "@supports (animation-timeline-unsupported: scroll())"),
    );
    await expect(page.locator(".progress")).toBeHidden();
  });

  test("with reduced motion the bar is hidden and not animated", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pageUrl);
    await expect(page.locator(".progress")).toBeHidden();
    expect(await page.locator(".progress").evaluate((el) => el.getAnimations().length)).toBe(0);
  });
});

test.describe("CSS source", () => {
  test("animates transform: scaleX on a root block scroll timeline, not width", () => {
    const keyframes = css.match(/@keyframes\s+progress\s*\{([\s\S]*?\}\s*)\}/)![1];
    expect(keyframes).toMatch(/transform:\s*scaleX\(0\)/);
    expect(keyframes).toMatch(/transform:\s*scaleX\(1\)/);
    expect(keyframes).not.toMatch(/width/);
    expect(css).toMatch(/animation-timeline:\s*scroll\(root block\)/);
  });

  test("duration auto, linear timing, fill both", async ({ page }) => {
    await page.goto(pageUrl);
    const s = await page.locator(".progress").evaluate((el) => {
      const c = getComputedStyle(el);
      return [c.animationDuration, c.animationTimingFunction, c.animationFillMode, c.transformOrigin.split(" ")[0]];
    });
    expect(s).toEqual(["auto", "linear", "both", "0px"]);
  });
});
