import { describe, expect, it, vi } from "vitest";

import { StateStore, createComputed } from "./state-store";

describe("StateStore", () => {
  it("returns the initial state snapshot", () => {
    const store = new StateStore({
      todos: ["write tests"],
      filter: "all",
      count: 1,
    });

    expect(store.getState()).toEqual({
      todos: ["write tests"],
      filter: "all",
      count: 1,
    });
  });

  it("merges a partial object update into the current state", () => {
    const store = new StateStore({
      todos: ["one"],
      filter: "all",
      count: 0,
    });

    store.setState({ count: 2 });

    expect(store.getState()).toEqual({
      todos: ["one"],
      filter: "all",
      count: 2,
    });
  });

  it("accepts a functional updater and uses the current state