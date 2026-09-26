import { describe, expect, it, vi } from "vitest";

import { createStore, createComputed } from "./reactive-state-store.js";

describe("StateStore", () => {
  it("returns the initial state", () => {
    const store = createStore({ count: 0, filter: "all" });

    expect(store.getState()).toEqual({ count: 0, filter: "all" });
  });

  it("merges a partial update", () => {
    const store = createStore({ count: 0, filter: "all" });
    store.setState({ count: 2 });

    expect(store.getState()).toEqual({ count: 2, filter: "all" });
  });

  it.skip("accepts a functional updater", () => {
    const store = createStore({ count: 1, filter: "all" });

    store.setState((state) => ({
      count: state.count + 1,
    }));

    expect(store.getState()).toEqual({ count: 2, filter: "all" });
  });

  it("notifies subscribers only when the selected value changes", () => {
    const store = createStore({ count: 1, filter: "all" });
    const listener = vi.fn();

    store.subscribe((state) => state.count, listener);

    store.setState({ count: 2 });
    store.setState({ filter: "active" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(2);
  });

  it("does not notify when the selected value is unchanged", () => {
    const store = createStore({ count: 1, filter: "all" });
    const listener = vi.fn();

    store.subscribe((state) => state.count, listener);

    store.setState({ filter: "active" });
    store.setState({ filter: "completed" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("supports unsubscribe", () => {
    const store = createStore({ count: 1 });
    const listener = vi.fn();

    const sub = store.subscribe((state) => state.count, listener);

    sub.unsubscribe();
    store.setState({ count: 2 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("supports computed values", () => {
    const store = createStore({ count: 1, filter: "all" });
    const computed = createComputed(store, (state) => state.count * 2);

    expect(computed.getValue()).toBe(2);

    store.setState({ count: 3 });
    expect(computed.getValue()).toBe(6);

    store.setState({ filter: "active" });
    expect(computed.getValue()).toBe(6);
  });
});
