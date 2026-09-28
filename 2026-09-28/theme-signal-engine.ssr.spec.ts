// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createTokenEngine } from "./theme-signal-engine.js";

const initialTokens = {
  colors: { brand: { primary: "#3b82f6", secondary: "#111" } },
  spacing: { sm: "4px" },
};

/** Collapses whitespace so assertions don't depend on the exact formatting. */
function normalize(css: string) {
  return css.replace(/\s+/g, " ").trim();
}

describe("createTokenEngine (SSR, no DOM)", () => {
  it("runs in an environment without window or document", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  describe("toCssString", () => {
    it("flattens nested tokens into CSS variables under the selector", () => {
      const engine = createTokenEngine(initialTokens);

      const css = normalize(engine.toCssString(":root"));

      expect(css).toMatch(/^:root \{.*\}$/);
      expect(css).toContain("--colors-brand-primary: #3b82f6;");
      expect(css).toContain("--colors-brand-secondary: #111;");
      expect(css).toContain("--spacing-sm: 4px;");
    });

    it("supports a scoped selector", () => {
      const engine = createTokenEngine({ colors: { bg: "#000" } });

      const css = normalize(engine.toCssString(".modal-dark"));

      expect(css).toMatch(/^\.modal-dark \{.*\}$/);
      expect(css).toContain("--colors-bg: #000;");
    });

    it("flattens deeply nested tokens", () => {
      const engine = createTokenEngine({
        typography: { heading: { h1: { size: "2rem" } } },
      });

      expect(normalize(engine.toCssString(":root"))).toContain(
        "--typography-heading-h1-size: 2rem;",
      );
    });

    it("reflects values changed with setToken", () => {
      const engine = createTokenEngine(initialTokens);

      engine.setToken("colors.brand.primary", "#ff0000");

      const css = normalize(engine.toCssString(":root"));
      expect(css).toContain("--colors-brand-primary: #ff0000;");
      expect(css).not.toContain("#3b82f6");
    });
  });

  describe("setToken on the server", () => {
    it("does not throw without requestAnimationFrame", () => {
      const engine = createTokenEngine(initialTokens);

      expect(() => engine.setToken("spacing.sm", "8px")).not.toThrow();
    });

    it("still notifies subscribers", () => {
      const engine = createTokenEngine(initialTokens);
      const listener = vi.fn();
      engine.subscribe(listener);

      engine.setToken("spacing.sm", "8px");

      expect(listener).toHaveBeenCalledWith("spacing.sm", "8px");
    });
  });

  it("destroy does not throw without a DOM", () => {
    const engine = createTokenEngine(initialTokens);
    engine.setToken("spacing.sm", "8px");

    expect(() => engine.destroy()).not.toThrow();
  });
});
