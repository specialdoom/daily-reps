import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCombobox,
  type Combobox,
  type ComboboxConfig,
  type ComboboxOption,
} from "./combobox.js";

const fruits: ComboboxOption<string>[] = [
  { id: "apple", value: "a", label: "Apple" },
  { id: "apricot", value: "ap", label: "Apricot" },
  { id: "banana", value: "b", label: "Banana" },
  { id: "blueberry", value: "bb", label: "Blueberry", disabled: true },
  { id: "cherry", value: "c", label: "Cherry" },
];

/** A promise whose resolve/reject are exposed, to control response order. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Async fetcher whose responses are resolved manually, keyed by query. */
function createControlledFetcher() {
  const requests = new Map<
    string,
    ReturnType<typeof deferred<readonly ComboboxOption<string>[]>> & {
      signal: AbortSignal;
    }
  >();
  const fetcher = vi.fn((query: string, signal: AbortSignal) => {
    const request = { ...deferred<readonly ComboboxOption<string>[]>(), signal };
    requests.set(query, request);
    return request.promise;
  });
  return { fetcher, requests };
}

const option = (id: string): ComboboxOption<string> => ({
  id,
  value: id,
  label: id.toUpperCase(),
});

describe("createCombobox", () => {
  let combobox: Combobox<string>;

  function setup(config: Partial<ComboboxConfig<string>> = {}) {
    combobox = createCombobox<string>({ id: "fruit", source: fruits, ...config });
    return combobox;
  }

  const state = () => combobox.getState();
  const key = (k: string, extra: { altKey?: boolean; isComposing?: boolean } = {}) =>
    combobox.send({ type: "KEYDOWN", key: k, ...extra });
  const type = (value: string) => combobox.send({ type: "INPUT", value });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    combobox?.destroy();
    vi.useRealTimers();
  });

  describe("state store", () => {
    it("starts closed and empty", () => {
      setup();
      expect(state()).toMatchObject({
        isOpen: false,
        inputValue: "",
        activeId: null,
        visibleOptions: [],
        status: "idle",
        announcement: "",
      });
      expect(state().selectedIds.size).toBe(0);
    });

    it("keeps the same reference and does not notify on no-op events", () => {
      setup();
      const listener = vi.fn();
      combobox.subscribe(listener);
      const before = state();

      key("Escape");
      combobox.send({ type: "CLOSE" });
      combobox.send({ type: "OPTION_HOVER", id: "missing" });

      expect(state()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });

    it("does not notify when opening an already open popup or re-typing the same value", () => {
      setup();
      type("ap");
      const listener = vi.fn();
      combobox.subscribe(listener);
      const before = state();

      combobox.send({ type: "OPEN" });
      type("ap");

      expect(state()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });

    it("creates a new snapshot on every real change and leaves old snapshots untouched", () => {
      setup();
      const first = state();
      type("a");
      expect(state()).not.toBe(first);
      expect(first.isOpen).toBe(false);
      expect(first.inputValue).toBe("");
    });

    it("stops notifying after unsubscribe", () => {
      setup();
      const listener = vi.fn();
      const unsubscribe = combobox.subscribe(listener);
      type("a");
      unsubscribe();
      type("ap");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("filtering (sync source)", () => {
    it("filters case-insensitively by label and opens", () => {
      setup();
      type("AP");
      expect(state().isOpen).toBe(true);
      expect(state().visibleOptions.map((o) => o.id)).toEqual(["apple", "apricot"]);
    });

    it("uses a custom filter when provided", () => {
      setup({ filter: (o, q) => o.label.startsWith(q) });
      type("B");
      expect(state().visibleOptions.map((o) => o.id)).toEqual(["banana", "blueberry"]);
    });

    it("keeps activeId when its option is still visible", () => {
      setup();
      type("a");
      key("ArrowDown");
      key("ArrowDown");
      expect(state().activeId).toBe("apricot");
      type("apr");
      expect(state().activeId).toBe("apricot");
    });

    it("resets activeId when its option is filtered out", () => {
      setup();
      type("a");
      key("ArrowDown");
      type("ban");
      expect(state().activeId).toBeNull();
    });
  });

  describe("keyboard navigation", () => {
    beforeEach(() => {
      setup();
      type("");
    });

    it("moves to the next enabled option, skipping disabled ones, and wraps", () => {
      const visited = Array.from({ length: 5 }, () => {
        key("ArrowDown");
        return state().activeId;
      });
      expect(visited).toEqual(["apple", "apricot", "banana", "cherry", "apple"]);
    });

    it("ArrowUp with nothing active goes to the last enabled option and wraps backwards", () => {
      key("ArrowUp");
      expect(state().activeId).toBe("cherry");
      key("ArrowUp");
      expect(state().activeId).toBe("banana");
    });

    it("Home and End jump to the first and last enabled options", () => {
      key("End");
      expect(state().activeId).toBe("cherry");
      key("Home");
      expect(state().activeId).toBe("apple");
    });

    it("OPTION_HOVER moves the active option, but not onto disabled or unknown options", () => {
      combobox.send({ type: "OPTION_HOVER", id: "banana" });
      expect(state().activeId).toBe("banana");
      combobox.send({ type: "OPTION_HOVER", id: "blueberry" });
      combobox.send({ type: "OPTION_HOVER", id: "missing" });
      expect(state().activeId).toBe("banana");
    });
  });

  describe("keyboard edge cases", () => {
    it("ArrowDown on a closed popup opens it without moving", () => {
      setup();
      expect(key("ArrowDown")).toBe(true);
      expect(state().isOpen).toBe(true);
      expect(state().activeId).toBeNull();
    });

    it("Alt+ArrowDown opens and never moves the active option", () => {
      setup();
      key("ArrowDown", { altKey: true });
      expect(state().isOpen).toBe(true);
      key("ArrowDown");
      const before = state();
      key("ArrowDown", { altKey: true });
      expect(state()).toBe(before);
    });

    it("with loop: false the active option stays at both ends", () => {
      setup({ loop: false });
      type("");
      key("End");
      key("ArrowDown");
      expect(state().activeId).toBe("cherry");
      key("Home");
      key("ArrowUp");
      expect(state().activeId).toBe("apple");
    });

    it("does not loop forever when every option is disabled", () => {
      setup({ source: fruits.map((o) => ({ ...o, disabled: true })) });
      type("");
      key("ArrowDown");
      key("ArrowUp");
      expect(state().activeId).toBeNull();
    });

    it("does nothing on an empty list", () => {
      setup();
      type("zzz");
      const before = state();
      key("ArrowDown");
      expect(state()).toBe(before);
    });

    it("Escape closes first, then clears the input and stale options", () => {
      setup();
      type("ap");
      key("ArrowDown");
      expect(key("Escape")).toBe(true);
      expect(state()).toMatchObject({ isOpen: false, inputValue: "ap", activeId: null });

      expect(key("Escape")).toBe(true);
      expect(state()).toMatchObject({ inputValue: "", visibleOptions: [], activeId: null });

      // Nothing left to clear: let Escape bubble (e.g. to close a dialog).
      expect(key("Escape")).toBe(false);
    });

    it("Tab closes without selecting and is not handled", () => {
      setup();
      type("a");
      key("ArrowDown");
      expect(key("Tab")).toBe(false);
      expect(state().isOpen).toBe(false);
      expect(state().selectedIds.size).toBe(0);
    });

    it("leaves Home/End to the native caret while closed", () => {
      setup();
      expect(key("Home")).toBe(false);
      expect(key("End")).toBe(false);
      expect(state().isOpen).toBe(false);
    });
  });

  describe("single selection", () => {
    it("Enter selects the active option, closes and fills the input", () => {
      const onChange = vi.fn();
      setup({ onChange });
      type("ban");
      key("ArrowDown");
      expect(key("Enter")).toBe(true);

      expect(state()).toMatchObject({ isOpen: false, inputValue: "Banana" });
      expect([...state().selectedIds]).toEqual(["banana"]);
      expect(onChange).toHaveBeenCalledWith([fruits[2]]);
    });

    it("Enter on a closed popup does not select a stale active option", () => {
      const onChange = vi.fn();
      setup({ onChange });
      type("a");
      key("ArrowDown");
      key("Escape");

      expect(key("Enter")).toBe(false);
      expect(state().selectedIds.size).toBe(0);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("re-selecting the selected option does not call onChange again", () => {
      const onChange = vi.fn();
      setup({ onChange });
      for (let i = 0; i < 2; i++) {
        type("ban");
        key("ArrowDown");
        key("Enter");
      }
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(state().inputValue).toBe("Banana");
    });

    it("OPTION_CLICK selects, but ignores disabled and unknown ids", () => {
      const onChange = vi.fn();
      setup({ onChange });
      type("b");
      combobox.send({ type: "OPTION_CLICK", id: "blueberry" });
      expect(() => combobox.send({ type: "OPTION_CLICK", id: "missing" })).not.toThrow();
      expect(onChange).not.toHaveBeenCalled();

      combobox.send({ type: "OPTION_CLICK", id: "banana" });
      expect([...state().selectedIds]).toEqual(["banana"]);
    });
  });

  describe("multiple selection", () => {
    it("toggles selection, stays open and announces", () => {
      setup({ selectionMode: "multiple" });
      type("a");
      key("ArrowDown");
      key("Enter");
      expect(state().isOpen).toBe(true);
      expect(state().announcement).toBe("Apple selected.");

      key("Enter");
      expect(state().selectedIds.size).toBe(0);
      expect(state().announcement).toBe("Apple deselected.");
    });

    it("onChange includes selected options that are no longer visible", () => {
      const onChange = vi.fn();
      setup({ selectionMode: "multiple", onChange });
      type("apple");
      key("ArrowDown");
      key("Enter");
      type("ban");
      key("ArrowDown");
      key("Enter");

      expect(onChange).toHaveBeenLastCalledWith([fruits[0], fruits[2]]);
      key("Enter"); // deselect Banana
      expect(onChange).toHaveBeenLastCalledWith([fruits[0]]);
      expect([...state().selectedIds]).toEqual(["apple"]);
    });

    it("a pending results announcement does not overwrite the selection announcement", () => {
      setup({ selectionMode: "multiple" });
      type("ap");
      key("ArrowDown");
      key("Enter");
      vi.advanceTimersByTime(500);
      expect(state().announcement).toBe("Apple selected.");
    });
  });

  describe("announcements (sync source)", () => {
    it("announces the result count once, after the debounce", () => {
      setup({ debounceMs: 100 });
      type("a");
      type("ap");
      expect(state().announcement).toBe("");
      vi.advanceTimersByTime(100);
      expect(state().announcement).toBe("2 results available.");
    });

    it.each([
      ["no results", "zzz", "No results."],
      ["one result", "apple", "One result available."],
    ])("announces %s", (_, query, expected) => {
      setup();
      type(query);
      vi.advanceTimersByTime(150);
      expect(state().announcement).toBe(expected);
    });

    it.each([
      ["Escape", () => key("Escape")],
      ["Tab", () => key("Tab")],
      ["BLUR", () => combobox.send({ type: "BLUR" })],
      ["CLOSE", () => combobox.send({ type: "CLOSE" })],
      [
        "single-select Enter",
        () => {
          key("ArrowDown");
          key("Enter");
        },
      ],
    ])("closing via %s cancels the pending announcement", (_, close) => {
      setup();
      type("b");
      close();
      vi.advanceTimersByTime(500);
      expect(state().isOpen).toBe(false);
      expect(state().announcement).toBe("");
    });
  });

  describe("IME composition", () => {
    it("does not filter during composition and filters once on composition end", () => {
      setup();
      type("");
      combobox.send({ type: "COMPOSITION_START" });
      type("ap");
      expect(state().inputValue).toBe("ap");
      expect(state().visibleOptions).toHaveLength(fruits.length);

      combobox.send({ type: "COMPOSITION_END", value: "ap" });
      expect(state().visibleOptions.map((o) => o.id)).toEqual(["apple", "apricot"]);
    });

    it("Enter while composing does not select", () => {
      setup();
      type("a");
      key("ArrowDown");
      expect(key("Enter", { isComposing: true })).toBe(false);
      combobox.send({ type: "COMPOSITION_START" });
      expect(key("Enter")).toBe(false);
      expect(state().selectedIds.size).toBe(0);
    });

    it.each(["BLUR", "FOCUS"] as const)(
      "%s clears a composition that never ended",
      (eventType) => {
        setup();
        combobox.send({ type: "COMPOSITION_START" });
        combobox.send({ type: eventType });
        type("");
        expect(key("ArrowDown")).toBe(true);
        expect(state().activeId).toBe("apple");
      },
    );
  });

  describe("blur vs click", () => {
    it("keeps the popup open for the blur caused by clicking an option", () => {
      setup();
      type("");
      combobox.send({ type: "OPTION_POINTERDOWN", id: "banana" });
      combobox.send({ type: "BLUR" });
      expect(state().isOpen).toBe(true);

      combobox.send({ type: "OPTION_CLICK", id: "banana" });
      expect([...state().selectedIds]).toEqual(["banana"]);
    });

    it("closes on a genuine blur", () => {
      setup();
      type("");
      combobox.send({ type: "BLUR" });
      expect(state().isOpen).toBe(false);
    });

    it("a pointerdown without a click cannot swallow a later blur", () => {
      setup();
      type("");
      combobox.send({ type: "OPTION_POINTERDOWN", id: "banana" });
      vi.advanceTimersByTime(0); // next task: the pointer interaction is over
      combobox.send({ type: "BLUR" });
      expect(state().isOpen).toBe(false);
    });
  });

  describe("async source", () => {
    it("debounces requests and passes an AbortSignal", async () => {
      const { fetcher } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 50 });
      type("a");
      type("ab");
      type("abc");
      expect(state().status).toBe("loading");
      await vi.advanceTimersByTimeAsync(50);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith("abc", expect.any(AbortSignal));
    });

    it("only the latest request commits, even when responses arrive out of order", async () => {
      const { fetcher, requests } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 10 });
      for (const query of ["a", "ab", "abc"]) {
        type(query);
        await vi.advanceTimersByTimeAsync(10);
      }
      requests.get("abc")!.resolve([option("abc")]);
      requests.get("a")!.resolve([option("a")]);
      requests.get("ab")!.resolve([option("ab")]);
      await vi.advanceTimersByTimeAsync(0);

      expect(state().visibleOptions.map((o) => o.id)).toEqual(["abc"]);
      expect(state()).toMatchObject({ status: "idle", announcement: "One result available." });
      expect(requests.get("a")!.signal.aborted).toBe(true);
      expect(requests.get("ab")!.signal.aborted).toBe(true);
    });

    it("drops a stale response that lands while the next query is still debouncing", async () => {
      const { fetcher, requests } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 10 });
      type("abc");
      await vi.advanceTimersByTimeAsync(10);
      type("abcd");
      requests.get("abc")!.resolve([option("stale")]);
      await vi.advanceTimersByTimeAsync(0);

      expect(state().visibleOptions).toEqual([]);
      expect(state().status).toBe("loading");
    });

    it("keeps previous options and announces on error", async () => {
      const { fetcher, requests } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 10 });
      type("a");
      await vi.advanceTimersByTimeAsync(10);
      requests.get("a")!.resolve([option("a")]);
      await vi.advanceTimersByTimeAsync(0);

      type("ab");
      await vi.advanceTimersByTimeAsync(10);
      const error = new Error("boom");
      requests.get("ab")!.reject(error);
      await vi.advanceTimersByTimeAsync(0);

      expect(state()).toMatchObject({
        status: "error",
        error,
        announcement: "Failed to get the results.",
      });
      expect(state().visibleOptions.map((o) => o.id)).toEqual(["a"]);
    });

    it("a fetcher that throws synchronously ends in the error state", async () => {
      const error = new Error("sync boom");
      setup({
        source: () => {
          throw error;
        },
        debounceMs: 10,
      });
      type("a");
      await vi.advanceTimersByTimeAsync(10);
      expect(state()).toMatchObject({ status: "error", error });
    });

    it("closing cancels the pending request and drops its response", async () => {
      const { fetcher, requests } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 10 });
      type("a");
      await vi.advanceTimersByTimeAsync(10);
      key("Escape");
      requests.get("a")!.resolve([option("late")]);
      await vi.advanceTimersByTimeAsync(0);

      expect(requests.get("a")!.signal.aborted).toBe(true);
      expect(state()).toMatchObject({ isOpen: false, status: "idle", announcement: "" });
    });

    it("closing during the debounce means the request never starts", async () => {
      const { fetcher } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 10 });
      type("a");
      combobox.send({ type: "CLOSE" });
      await vi.advanceTimersByTimeAsync(50);
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("cancels pending work and ignores events afterwards", async () => {
      const { fetcher, requests } = createControlledFetcher();
      setup({ source: fetcher, debounceMs: 10 });
      const listener = vi.fn();
      combobox.subscribe(listener);
      type("a");
      await vi.advanceTimersByTimeAsync(10);
      listener.mockClear();

      combobox.destroy();
      const before = state();
      type("ab");
      await vi.advanceTimersByTimeAsync(50);

      expect(requests.get("a")!.signal.aborted).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(state()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("prop getters", () => {
    it("input props: aria-activedescendant is undefined when closed or nothing is active", () => {
      setup();
      expect(combobox.getInputProps()["aria-activedescendant"]).toBeUndefined();
      type("");
      expect(combobox.getInputProps()["aria-activedescendant"]).toBeUndefined();
      key("ArrowDown");
      expect(combobox.getInputProps()).toMatchObject({
        role: "combobox",
        "aria-expanded": true,
        "aria-autocomplete": "list",
        "aria-activedescendant": "fruit-option-apple",
      });
    });

    it("input props: aria-busy reflects loading", async () => {
      const { fetcher } = createControlledFetcher();
      setup({ source: fetcher });
      type("a");
      expect(combobox.getInputProps()["aria-busy"]).toBe(true);
    });

    it("ids line up: aria-controls → listbox id, aria-activedescendant → option id", () => {
      setup();
      type("");
      key("ArrowDown");
      const inputProps = combobox.getInputProps();
      expect(inputProps["aria-controls"]).toBe(combobox.getListboxProps().id);
      expect(inputProps["aria-activedescendant"]).toBe(combobox.getOptionProps("apple").id);
    });

    it("ids are derived from config.id, so two instances never collide", () => {
      const shipping = createCombobox({ id: "shipping", source: fruits });
      const billing = createCombobox({ id: "billing", source: fruits });
      expect(shipping.getOptionProps("apple").id).not.toBe(billing.getOptionProps("apple").id);
      shipping.destroy();
      billing.destroy();
    });

    it("listbox props reflect the selection mode", () => {
      expect(setup().getListboxProps()).toEqual({
        role: "listbox",
        id: "fruit-listbox",
        "aria-multiselectable": false,
      });
      combobox.destroy();
      expect(setup({ selectionMode: "multiple" }).getListboxProps()["aria-multiselectable"]).toBe(true);
    });

    it("option props: 1-based position, set size, selected, disabled and active", () => {
      setup({ selectionMode: "multiple" });
      type("b");
      key("ArrowDown");
      key("Enter");

      expect(combobox.getOptionProps("banana")).toEqual({
        role: "option",
        id: "fruit-option-banana",
        "aria-selected": true,
        "aria-disabled": undefined,
        "data-active": true,
        "aria-setsize": 2,
        "aria-posinset": 1,
      });
      expect(combobox.getOptionProps("blueberry")).toMatchObject({
        "aria-disabled": true,
        "aria-posinset": 2,
      });
    });

    it("option props: unknown ids get no position instead of an invalid 0", () => {
      setup();
      type("");
      expect(combobox.getOptionProps("missing")).toMatchObject({
        "aria-setsize": undefined,
        "aria-posinset": undefined,
      });
    });
  });
});
