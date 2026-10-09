import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { createHistory } from "./history.svelte";
import type { Board } from "./types";

function makeBoard() {
  const board: Board = $state({
    name: "Sprint",
    cards: [{ id: 1, title: "Write tests", tags: ["qa"] }],
  });
  return board;
}

describe("createHistory", () => {
  it("records the initial state, so there is nothing to undo or redo", () => {
    const history = createHistory(makeBoard());
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("stores snapshots, not the live proxy", () => {
    const board = makeBoard();
    const history = createHistory(board);

    board.name = "Renamed";
    history.commit();
    board.name = "Uncommitted";
    board.cards[0].tags.push("x");

    history.undo();
    expect($state.snapshot(board)).toEqual({
      name: "Sprint",
      cards: [{ id: 1, title: "Write tests", tags: ["qa"] }],
    });
    history.redo();
    expect(board.name).toBe("Renamed");
    expect(board.cards[0].tags).toEqual(["qa"]);
  });

  it("restores into the same state object", () => {
    const board = makeBoard();
    const cards = board.cards;
    const history = createHistory(board);
    board.cards.push({ id: 2, title: "New card", tags: [] });
    history.commit();

    history.undo();
    expect(board.cards).toHaveLength(1);
    // The array is replaced, but `board` itself is the same proxy.
    expect(cards).not.toBe(board.cards);
  });

  it("mutating restored state does not corrupt stored entries", () => {
    const board = makeBoard();
    const history = createHistory(board);
    board.cards.push({ id: 2, title: "New card", tags: [] });
    history.commit();

    history.undo();
    board.cards[0].tags.push("dirty");
    board.name = "dirty";

    history.redo();
    expect($state.snapshot(board)).toEqual({
      name: "Sprint",
      cards: [
        { id: 1, title: "Write tests", tags: ["qa"] },
        { id: 2, title: "New card", tags: [] },
      ],
    });
    history.undo();
    expect($state.snapshot(board)).toEqual({
      name: "Sprint",
      cards: [{ id: 1, title: "Write tests", tags: ["qa"] }],
    });
  });

  it("commit after undo discards the redo branch", () => {
    const board = makeBoard();
    const history = createHistory(board);
    board.name = "A";
    history.commit();
    board.name = "B";
    history.commit();

    history.undo();
    history.undo();
    expect(history.canRedo).toBe(true);
    board.name = "C";
    history.commit();
    expect(history.canRedo).toBe(false);

    history.redo();
    expect(board.name).toBe("C");
    history.undo();
    expect(board.name).toBe("Sprint");
    expect(history.canUndo).toBe(false);
  });

  it("undo at the oldest and redo at the newest are no-ops", () => {
    const board = makeBoard();
    const history = createHistory(board);
    board.name = "A";
    history.commit();

    history.redo();
    expect(board.name).toBe("A");
    history.undo();
    history.undo();
    expect(board.name).toBe("Sprint");
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it("keeps only the last 50 states after 60 commits", () => {
    const state = $state({ n: 0 });
    const history = createHistory(state);
    for (let i = 1; i <= 60; i++) {
      state.n = i;
      history.commit();
    }

    let undos = 0;
    while (history.canUndo) {
      history.undo();
      undos++;
    }
    expect(undos).toBe(49);
    expect(state.n).toBe(11);
    history.undo();
    expect(state.n).toBe(11);
  });

  it("honours a custom limit, including 1", () => {
    const state = $state({ n: 0 });
    const history = createHistory(state, { limit: 1 });
    state.n = 1;
    history.commit();
    state.n = 2;
    history.commit();
    expect(history.canUndo).toBe(false);
    history.undo();
    expect(state.n).toBe(2);
  });

  it.each([0, -1, 2.5, NaN])("rejects limit %s instead of growing without bound", (limit) => {
    const state = $state({ n: 0 });
    expect(() => createHistory(state, { limit })).toThrow(RangeError);
  });

  it("canUndo / canRedo are reactive", () => {
    const board = makeBoard();
    const history = createHistory(board);
    const seen: string[] = [];
    const cleanup = $effect.root(() => {
      $effect(() => {
        seen.push(`${history.canUndo}/${history.canRedo}`);
      });
    });
    flushSync();

    board.name = "A";
    history.commit();
    flushSync();
    history.undo();
    flushSync();
    history.redo();
    flushSync();
    cleanup();

    expect(seen).toEqual(["false/false", "true/false", "false/true", "true/false"]);
  });

  it("removes keys that the restored entry does not have", () => {
    const state = $state<{ name: string; desc?: string }>({ name: "a" });
    const history = createHistory(state);
    state.desc = "x";
    history.commit();

    history.undo();
    expect($state.snapshot(state)).toEqual({ name: "a" });
    expect("desc" in state).toBe(false);
  });

  it("restores a top-level array, including shrinking it", () => {
    const list = $state([1]);
    const history = createHistory(list);
    list.push(2);
    history.commit();

    history.undo();
    expect($state.snapshot(list)).toEqual([1]);
    history.redo();
    expect($state.snapshot(list)).toEqual([1, 2]);
  });

  it("does not throw or desync the index on state holding a function", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fn = () => 1;
    const state = $state({ n: 0, fn });
    const history = createHistory(state);
    state.n = 1;
    history.commit();

    expect(() => history.undo()).not.toThrow();
    expect(state.n).toBe(0);
    expect(state.fn).toBe(fn);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it("restores Date as a Date, and class instances as plain objects", () => {
    class Point {
      constructor(public x: number) {}
      get double() {
        return this.x * 2;
      }
    }
    const state = $state({ at: new Date(0), p: new Point(1) });
    const history = createHistory(state);
    state.at = new Date(1000);
    history.commit();

    history.undo();
    expect(state.at).toBeInstanceOf(Date);
    expect(state.at.getTime()).toBe(0);
    // Documented limitation: the prototype is lost.
    expect(state.p).not.toBeInstanceOf(Point);
    expect(state.p).toEqual({ x: 1 });
  });
});
