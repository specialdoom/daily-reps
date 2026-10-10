import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// SOLUTION=before runs the same spec against ../before-review (see vite.config.ts).
const root =
  process.env.SOLUTION === "before" ? "../before-review/product-card/" : "./";
const source = (file: string) =>
  readFileSync(fileURLToPath(new URL(root + file, import.meta.url)), "utf8");

type Parent = "block" | "inline-block" | "flex";

/** Replaces the demo with one card per entry; a number is the wrapper's width in px. */
async function mount(page: Page, wrappers: (number | Parent)[]) {
  await page.goto("/");
  await page.evaluate(async (wrappers) => {
    await customElements.whenDefined("product-card");
    document.body.style.display = "block";
    document.body.innerHTML = wrappers
      .map((w) => {
        const style =
          typeof w === "number" ? `width: ${w}px` : `display: ${w}`;
        return `
          <div class="wrapper" style="${style}">
            <product-card name="Trail Shoe" price="$120" image="/shoe.jpg"
                          description="Light, grippy, waterproof.">
              <button slot="actions">Add to cart</button>
            </product-card>
          </div>`;
      })
      .join("");
    const cards = [...document.querySelectorAll("product-card")];
    await Promise.all(cards.map((c) => (c as any).updateComplete));
    await Promise.all(
      cards.map((c) => c.shadowRoot!.querySelector("img")!.decode()),
    );
  }, wrappers);
}

async function resize(page: Page, width: number, index = 0) {
  await page
    .locator(".wrapper")
    .nth(index)
    .evaluate((el, width) => (el.style.width = `${width}px`), width);
}

/** Everything the assertions need, measured inside the card's shadow root. */
async function measure(page: Page, index = 0) {
  return page
    .locator("product-card")
    .nth(index)
    .evaluate((card) => {
      const $ = (sel: string) => card.shadowRoot!.querySelector(sel)!;
      const box = (el: Element) => {
        const { left, right, top, bottom, width, height } =
          el.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const article = getComputedStyle($("article"));
      return {
        card: box(card),
        display: article.display,
        flexDirection: article.flexDirection,
        descDisplay: getComputedStyle($(".desc")).display,
        descVisible: ($(".desc") as HTMLElement).checkVisibility(),
        titleSize: parseFloat(getComputedStyle($("h3")).fontSize),
        img: box($("img")),
        imgFit: getComputedStyle($("img")).objectFit,
        body: box($(".body")),
        price: box($(".price")),
        action: box(card.querySelector("[slot=actions]")!),
      };
    });
}

type Layout = Awaited<ReturnType<typeof measure>>;

function expectStacked(m: Layout) {
  expect(m.display).toBe("flex");
  expect(m.flexDirection).toBe("column");
  expect(m.body.top).toBeGreaterThanOrEqual(m.img.bottom - 0.5);
}

function expectHorizontal(m: Layout) {
  expect(m.display).toBe("flex");
  expect(m.flexDirection).toBe("row");
  expect(m.body.left).toBeGreaterThanOrEqual(m.img.right - 0.5);
}

const sameRow = (m: Layout) =>
  m.action.top < m.price.bottom && m.price.top < m.action.bottom;

test.describe("layouts (README acceptance check)", () => {
  test("250px: stacked, description hidden", async ({ page }) => {
    await mount(page, [250]);
    const m = await measure(page);
    expectStacked(m);
    expect(m.descDisplay).toBe("none");
    expect(m.descVisible).toBe(false);
  });

  test("400px: stacked, description visible", async ({ page }) => {
    await mount(page, [400]);
    const m = await measure(page);
    expectStacked(m);
    expect(m.descVisible).toBe(true);
  });

  test("600px: horizontal, description visible", async ({ page }) => {
    await mount(page, [600]);
    const m = await measure(page);
    expectHorizontal(m);
    expect(m.descVisible).toBe(true);
  });
});

// The photo is 220x148, so both the 16:9 and the square box need a crop.
test("the image is cropped to its box, not stretched", async ({ page }) => {
  await mount(page, [250, 600]);
  expect((await measure(page, 0)).imgFit).toBe("cover");
  expect((await measure(page, 1)).imgFit).toBe("cover");
});

test("wide: the image stays square at 40% when the content is taller", async ({
  page,
}) => {
  await mount(page, [480, 600]);
  await page.locator("product-card").evaluateAll(async (cards) => {
    for (const card of cards as any[]) {
      card.description = "Light, grippy, waterproof. ".repeat(12);
      await card.updateComplete;
    }
  });
  for (const [i, width] of [480, 600].entries()) {
    const m = await measure(page, i);
    expect(m.body.height).toBeGreaterThan(m.img.height);
    expect(m.img.width).toBeCloseTo(width * 0.4, 0);
    expect(m.img.height).toBeCloseTo(m.img.width, 0);
  }
});

test("the hidden attribute still hides the card", async ({ page }) => {
  await mount(page, [300]);
  const card = page.locator("product-card");
  await card.evaluate((el) => el.toggleAttribute("hidden", true));
  await expect(card).toBeHidden();
});

test.describe("breakpoints", () => {
  test("279px is the narrow layout, 280px the medium one", async ({ page }) => {
    await mount(page, [279, 280]);
    const [narrow, medium] = [await measure(page, 0), await measure(page, 1)];
    expectStacked(narrow);
    expect(narrow.descVisible).toBe(false);
    expectStacked(medium);
    expect(medium.descVisible).toBe(true);
  });

  test("479px is still stacked, 480px is horizontal", async ({ page }) => {
    await mount(page, [479, 480]);
    expectStacked(await measure(page, 0));
    expectHorizontal(await measure(page, 1));
  });

  // Fractional widths happen all the time in fr/percentage grids.
  test("no width falls between two layouts", async ({ page }) => {
    await mount(page, [279.5, 479.5]);
    const [a, b] = [await measure(page, 0), await measure(page, 1)];
    expectStacked(a);
    expect(a.descVisible).toBe(false);
    expectStacked(b);
    expect(b.descVisible).toBe(true);
  });
});

test.describe("narrow (< 280px)", () => {
  test("image fills the card at 16:9", async ({ page }) => {
    await mount(page, [250]);
    const m = await measure(page);
    expect(m.img.width).toBeCloseTo(250, 0);
    expect(m.img.width / m.img.height).toBeCloseTo(16 / 9, 1);
  });

  test("price and actions are in one column", async ({ page }) => {
    await mount(page, [250]);
    const m = await measure(page);
    expect(sameRow(m)).toBe(false);
    expect(m.action.top).toBeGreaterThanOrEqual(m.price.bottom - 0.5);
  });
});

test.describe("medium (280px – 479px)", () => {
  test("price and actions share a row", async ({ page }) => {
    await mount(page, [400]);
    const m = await measure(page);
    expect(sameRow(m)).toBe(true);
    expect(m.action.left).toBeGreaterThanOrEqual(m.price.right - 0.5);
  });

  test("image fills the card width", async ({ page }) => {
    await mount(page, [400]);
    const m = await measure(page);
    expect(m.img.width).toBeCloseTo(400, 0);
  });
});

test.describe("wide (>= 480px)", () => {
  for (const width of [480, 600, 800]) {
    test(`${width}px: square image on the left at 40%`, async ({ page }) => {
      await mount(page, [width]);
      const m = await measure(page);
      expect(m.img.left).toBeCloseTo(m.card.left, 0);
      expect(m.img.width).toBeCloseTo(width * 0.4, 0);
      expect(m.img.height).toBeCloseTo(m.img.width, 0);
      expect(m.body.left).toBeGreaterThanOrEqual(m.img.right - 0.5);
      expect(m.body.right).toBeLessThanOrEqual(m.card.right + 0.5);
    });
  }
});

test("resizing the wrapper switches layouts live, without a reload", async ({
  page,
}) => {
  await mount(page, [200]);
  await page.evaluate(() => ((window as any).__sameDocument = true));

  let m = await measure(page);
  expectStacked(m);
  expect(m.descVisible).toBe(false);

  await resize(page, 400);
  m = await measure(page);
  expectStacked(m);
  expect(m.descVisible).toBe(true);

  await resize(page, 800);
  expectHorizontal(await measure(page));

  await resize(page, 200);
  m = await measure(page);
  expectStacked(m);
  expect(m.descVisible).toBe(false);

  expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

test("two cards of 250px and 600px get their own layout at the same time", async ({
  page,
}) => {
  await mount(page, [250, 600]);
  const [small, large] = [await measure(page, 0), await measure(page, 1)];
  expectStacked(small);
  expect(small.descVisible).toBe(false);
  expectHorizontal(large);
  expect(large.descVisible).toBe(true);
});

test("the demo page shows a wide and a narrow card in resizable wrappers", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("product-card")).toHaveCount(2);
  const layouts = await page.locator("product-card").evaluateAll((cards) =>
    cards.map((card) => {
      const article = card.shadowRoot!.querySelector("article")!;
      return {
        direction: getComputedStyle(article).flexDirection,
        resize: getComputedStyle(card.parentElement!).resize,
      };
    }),
  );
  expect(layouts.map((l) => l.direction).sort()).toEqual(["column", "row"]);
  expect(layouts.every((l) => l.resize === "horizontal")).toBe(true);
  // Nothing left over from the Vite template.
  await expect(page.locator("my-element")).toHaveCount(0);
});

test.describe("title", () => {
  test("scales with the container and is clamped at both ends", async ({
    page,
  }) => {
    await mount(page, [150, 200, 300, 400, 1200, 2000]);
    const sizes: number[] = [];
    for (let i = 0; i < 6; i++) sizes.push((await measure(page, i)).titleSize);
    const [xs, s, m, l, xl, xxl] = sizes;

    expect(m).toBeGreaterThan(s);
    expect(l).toBeGreaterThan(m);
    // clamp(): a floor for tiny cards, a ceiling for huge ones.
    expect(xs).toBe(s);
    expect(xl).toBe(xxl);
    expect(xs).toBeGreaterThanOrEqual(14);
    expect(xxl).toBeLessThanOrEqual(40);
  });

  test("follows the card, not the viewport", async ({ page }) => {
    await mount(page, [300]);
    const before = (await measure(page)).titleSize;
    await page.setViewportSize({ width: 600, height: 500 });
    expect((await measure(page)).titleSize).toBe(before);
  });
});

test.describe("host as query container", () => {
  test("is a named inline-size container with display: block", async ({
    page,
  }) => {
    await mount(page, [300]);
    const host = await page.locator("product-card").evaluate((card) => {
      const s = getComputedStyle(card);
      return [s.display, s.containerType, s.containerName];
    });
    expect(host).toEqual(["block", "inline-size", "card"]);
  });

  // inline-size containment means the host cannot take its width from its
  // content, so it needs a floor when the parent shrink-wraps.
  for (const parent of ["inline-block", "flex"] as const) {
    test(`does not collapse in a ${parent} parent with no width`, async ({
      page,
    }) => {
      await mount(page, [parent]);
      const m = await measure(page);
      expect(m.card.width).toBeGreaterThanOrEqual(120);
      expect(m.card.height).toBeGreaterThan(0);
      expect(m.img.right).toBeLessThanOrEqual(m.card.right + 0.5);
      expect(m.action.right).toBeLessThanOrEqual(m.card.right + 0.5);
    });
  }

  test("content never overflows the card", async ({ page }) => {
    const widths = [200, 250, 279, 280, 400, 479, 480, 600, 800];
    await mount(page, widths);
    for (let i = 0; i < widths.length; i++) {
      const m = await measure(page, i);
      for (const part of [m.img, m.body, m.price, m.action]) {
        expect(part.right, `${widths[i]}px`).toBeLessThanOrEqual(
          m.card.right + 0.5,
        );
      }
    }
  });
});

test.describe("source", () => {
  const component = source("src/product-card.ts");

  test("no @media anywhere in the styles", () => {
    expect(component).not.toContain("@media");
    expect(source("src/index.css")).not.toContain("@media");
  });

  test("no JavaScript resize logic", () => {
    expect(component).not.toMatch(/ResizeObserver|matchMedia|['"`]resize['"`]/);
  });

  test("title uses clamp() with cqi, not vw", () => {
    expect(component).toMatch(
      /font-size:\s*clamp\([^;,]+,[^;,]*cqi[^;,]*,[^;,]+\)/,
    );
    expect(component).not.toMatch(/\d(vw|vi)\b/);
  });

  test("no script runs while the wrapper is resized", async ({ page }) => {
    await mount(page, [200]);
    const calls = await page.evaluate(async () => {
      let calls = 0;
      const count = () => calls++;
      const card = document.querySelector("product-card") as any;
      const requestUpdate = card.requestUpdate;
      card.requestUpdate = function (...args: unknown[]) {
        count();
        return requestUpdate.apply(this, args);
      };
      const wrapper = document.querySelector<HTMLElement>(".wrapper")!;
      for (const width of [300, 500, 800]) {
        wrapper.style.width = `${width}px`;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return calls;
    });
    expect(calls).toBe(0);
  });
});
