// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenEngine } from "./theme-signal-engine.js";

const initialTokens = {
  colors: { brand: { primary: "#3b82f6", secondary: "#111" } },
  spacing: { sm: "4px" },
};

/** Queues rAF callbacks so tests decide exactly when a "frame" happens. */
function createFrameQueue() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancelAnimationFrame = vi.fn((id: number) => {
    callbacks.delete(id);
  });

  return {
    requestAnimationFrame,
    cancelAnimationFrame,
    get size() {
      return callbacks.size;
    },
    runFrame() {
      const queued = [...callbacks.values()];
      callbacks.clear();
      queued.forEach((callback) => callback(performance.now()));
    },
  };
}

function cssVar(element: HTMLElement, name: string) {
  return element.style.getPropertyValue(name);
}

describe("createTokenEngine (DOM)", () => {
  let frames: ReturnType<typeof createFrameQueue>;

  beforeEach(() => {
    frames = createFrameQueue();
    vi.stubGlobal("requestAnimationFrame", frames.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", frames.cancelAnimationFrame);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("style");
    document.body.innerHTML = "";
  });

  describe("applyTheme", () => {
    it("writes flattened tokens as CSS variables on :root by default", () => {
      const engine = createTokenEngine(initialTokens);

      engine.applyTheme();

      const root = document.documentElement;
      expect(cssVar(root, "--colors-brand-primary")).toBe("#3b82f6");
      expect(cssVar(root, "--colors-brand-secondary")).toBe("#111");
      expect(cssVar(root, "--spacing-sm")).toBe("4px");
    });

    it("scopes variables to a target element without touching :root", () => {
      const modal = document.createElement("div");
      document.body.append(modal);
      const engine = createTokenEngine({ colors: { bg: "#000" } });

      engine.applyTheme(modal);

      expect(cssVar(modal, "--colors-bg")).toBe("#000");
      expect(cssVar(document.documentElement, "--colors-bg")).toBe("");
    });

    it("keeps separate engines on :root and a scoped element independent", () => {
      const modal = document.createElement("div");
      const globalTheme = createTokenEngine({ colors: { bg: "#fff" } });
      const darkModal = createTokenEngine({ colors: { bg: "#000" } });

      globalTheme.applyTheme();
      darkModal.applyTheme(modal);

      expect(cssVar(document.documentElement, "--colors-bg")).toBe("#fff");
      expect(cssVar(modal, "--colors-bg")).toBe("#000");
    });
  });

  describe("setToken batching", () => {
    it("does not write to the DOM synchronously", () => {
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();

      engine.setToken("colors.brand.primary", "#ff0000");

      expect(cssVar(document.documentElement, "--colors-brand-primary")).toBe(
        "#3b82f6",
      );
    });

    it("writes the change when the next frame runs", () => {
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();

      engine.setToken("colors.brand.primary", "#ff0000");
      frames.runFrame();

      expect(cssVar(document.documentElement, "--colors-brand-primary")).toBe(
        "#ff0000",
      );
    });

    it("schedules a single frame for many synchronous setToken calls", () => {
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();

      engine.setToken("colors.brand.primary", "#ff0000");
      engine.setToken("colors.brand.secondary", "#222");
      engine.setToken("spacing.sm", "8px");

      expect(frames.requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it("applies only the last value when a token is set twice in one batch", () => {
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();
      const setProperty = vi.spyOn(
        document.documentElement.style,
        "setProperty",
      );

      engine.setToken("colors.brand.primary", "#ff0000");
      engine.setToken("colors.brand.primary", "#00ff00");
      frames.runFrame();

      expect(setProperty).toHaveBeenCalledTimes(1);
      expect(setProperty).toHaveBeenCalledWith(
        "--colors-brand-primary",
        "#00ff00",
      );
    });

    it("schedules a new frame for the next batch after a flush", () => {
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();

      engine.setToken("spacing.sm", "8px");
      frames.runFrame();
      engine.setToken("spacing.sm", "12px");

      expect(frames.requestAnimationFrame).toHaveBeenCalledTimes(2);
      frames.runFrame();
      expect(cssVar(document.documentElement, "--spacing-sm")).toBe("12px");
    });

    it("updates every themed element in the same frame", () => {
      const modal = document.createElement("div");
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();
      engine.applyTheme(modal);

      engine.setToken("spacing.sm", "8px");
      frames.runFrame();

      expect(cssVar(document.documentElement, "--spacing-sm")).toBe("8px");
      expect(cssVar(modal, "--spacing-sm")).toBe("8px");
    });

    it("includes tokens set before applyTheme when the theme is applied", () => {
      const engine = createTokenEngine(initialTokens);

      engine.setToken("colors.brand.primary", "#ff0000");
      engine.applyTheme();

      expect(cssVar(document.documentElement, "--colors-brand-primary")).toBe(
        "#ff0000",
      );
    });
  });

  describe("subscribe", () => {
    it("notifies listeners with the dotted path and the new value", () => {
      const engine = createTokenEngine(initialTokens);
      const listener = vi.fn();
      engine.subscribe(listener);

      engine.setToken("colors.brand.primary", "#ff0000");

      expect(listener).toHaveBeenCalledWith("colors.brand.primary", "#ff0000");
    });

    it("stops notifying after unsubscribe", () => {
      const engine = createTokenEngine(initialTokens);
      const listener = vi.fn();
      const unsubscribe = engine.subscribe(listener);

      unsubscribe();
      engine.setToken("colors.brand.primary", "#ff0000");

      expect(listener).not.toHaveBeenCalled();
    });

    it("only removes the listener that unsubscribed", () => {
      const engine = createTokenEngine(initialTokens);
      const first = vi.fn();
      const second = vi.fn();
      const unsubscribeFirst = engine.subscribe(first);
      engine.subscribe(second);

      unsubscribeFirst();
      engine.setToken("spacing.sm", "8px");

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith("spacing.sm", "8px");
    });
  });

  describe("destroy", () => {
    it("removes every engine variable from all themed elements", () => {
      const modal = document.createElement("div");
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();
      engine.applyTheme(modal);

      engine.destroy();

      for (const element of [document.documentElement, modal]) {
        expect(cssVar(element, "--colors-brand-primary")).toBe("");
        expect(cssVar(element, "--colors-brand-secondary")).toBe("");
        expect(cssVar(element, "--spacing-sm")).toBe("");
      }
    });

    it("leaves unrelated inline styles alone", () => {
      const root = document.documentElement;
      root.style.setProperty("color", "red");
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();

      engine.destroy();

      expect(root.style.getPropertyValue("color")).toBe("red");
    });

    it("cancels a pending frame so nothing is written afterwards", () => {
      const engine = createTokenEngine(initialTokens);
      engine.applyTheme();
      engine.setToken("colors.brand.primary", "#ff0000");

      engine.destroy();
      frames.runFrame();

      expect(frames.cancelAnimationFrame).toHaveBeenCalledTimes(1);
      expect(cssVar(document.documentElement, "--colors-brand-primary")).toBe(
        "",
      );
    });

    it("drops all listeners", () => {
      const engine = createTokenEngine(initialTokens);
      const listener = vi.fn();
      engine.subscribe(listener);

      engine.destroy();
      engine.setToken("spacing.sm", "8px");

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
