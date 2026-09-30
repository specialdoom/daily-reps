import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createListStore } from "./store.svelte";

type Task = { title: string; priority: number; tags: string[] };

const task = (title: string, priority = 0, tags: string[] = []): Task => ({
  title,
  priority,
  tags,
});

function createStore(size = 0) {
  const store = createListStore<Task>();
  for (let i = 0; i < size; i++) store.addItem(task(`#${i}`, i));
  return store;
}

// Runs `read` inside an effect and counts how many times it runs.
// The first run happens on the initial flush, so a fresh tracker has runs === 1.
const cleanups: (() => void)[] = [];

function track(read: () => unknown) {
  const tracker = { runs: 0 };
  cleanups.push(
    $effect.root(() => {
      $effect(() => {
        read();
        tracker.runs++;
      });
    }),
  );
  flushSync();
  return tracker;
}

afterEach(() => {
  cleanups.splice(0).forEach((stop) => stop());
});

describe("addItem", () => {
  it("returns sequential ids starting at 0", () => {
    const store = createStore();

    expect(store.addItem(task("a"))).toBe(0);
    expect(store.addItem(task("b"))).toBe(1);
    expect(store.addItem(task("c"))).toBe(2);
  });

  it("wraps the data in an item that starts unselected", () => {
    const store = createStore();
    const id = store.addItem(task("a", 3, ["x"]));

    expect(store.getItem(id)).toEqual({
      id,
      data: { title: "a", priority: 3, tags: ["x"] },
      isSelected: false,
    });
  });

  it("gives every store its own counter", () => {
    // Two requests on the same server must produce the same ids as the browser does.
    const first = createStore(3);
    const second = createStore();

    expect(first.state.map((item) => item.id)).toEqual([0, 1, 2]);
    expect(second.addItem(task("a"))).toBe(0);
  });

  // $state copies each field lazily, on its first read, so mutating the passed object
  // after addItem is unreliable either way. The guarantee is one-way: the store never
  // writes back into it.
  it("never writes back into the passed object", () => {
    const store = createStore();
    const data = task("original", 1, ["x"]);
    const id = store.addItem(data);

    store.updateField(id, "title", "changed");
    store.getItem(id)!.data.tags.push("y");
    store.setIsSelected(id, true);

    expect(data).toEqual({ title: "original", priority: 1, tags: ["x"] });
  });
});

describe("reading", () => {
  it("state lists items in insertion order", () => {
    const store = createStore(3);

    expect(store.state.map((item) => item.data.title)).toEqual([
      "#0",
      "#1",
      "#2",
    ]);
  });

  it("state returns a fresh array on every read", () => {
    const store = createStore(2);
    const before = store.state;

    store.addItem(task("new"));

    expect(before).toHaveLength(2);
    expect(store.state).toHaveLength(3);
    expect(store.state).not.toBe(store.state);
  });

  it("getItem returns null for an unknown id", () => {
    const store = createStore(1);

    expect(store.getItem(99)).toBeNull();
  });

  it("getItem keeps the item identity across reads", () => {
    const store = createStore(1);

    expect(store.getItem(0)).toBe(store.getItem(0));
  });
});

describe("updateField", () => {
  it("updates a single field of the item's data", () => {
    const store = createStore(2);

    store.updateField(1, "title", "changed");

    expect(store.getItem(1)?.data).toEqual({
      title: "changed",
      priority: 1,
      tags: [],
    });
    expect(store.getItem(0)?.data.title).toBe("#0");
  });

  it("preserves the item's identity", () => {
    const store = createStore(1);
    const before = store.getItem(0);

    store.updateField(0, "title", "changed");

    expect(store.getItem(0)).toBe(before);
  });

  it("ignores unknown ids", () => {
    const store = createStore(1);

    expect(() => store.updateField(99, "title", "x")).not.toThrow();
    expect(store.state).toHaveLength(1);
  });

  it("rejects fields and values that don't match the data type", () => {
    const store = createStore(1);

    // @ts-expect-error title is a string
    store.updateField(0, "title", 42);
    // @ts-expect-error unknown field
    store.updateField(0, "missing", "x");
    // @ts-expect-error id is not part of the data
    store.updateField(0, "id", 5);
  });
});

describe("setIsSelected", () => {
  it("selects and deselects an item", () => {
    const store = createStore(2);

    store.setIsSelected(1, true);
    expect(store.getItem(1)?.isSelected).toBe(true);
    expect(store.getItem(0)?.isSelected).toBe(false);

    store.setIsSelected(1, false);
    expect(store.getItem(1)?.isSelected).toBe(false);
  });

  it("ignores unknown ids", () => {
    const store = createStore(1);

    expect(() => store.setIsSelected(99, true)).not.toThrow();
  });
});

describe("removeItem", () => {
  it("removes the item from state and getItem", () => {
    const store = createStore(3);

    store.removeItem(1);

    expect(store.getItem(1)).toBeNull();
    expect(store.state.map((item) => item.id)).toEqual([0, 2]);
  });

  it("does not reuse the id of a removed item", () => {
    const store = createStore(2);

    store.removeItem(1);

    expect(store.addItem(task("new"))).toBe(2);
  });

  it("ignores unknown ids", () => {
    const store = createStore(1);

    store.removeItem(99);

    expect(store.state).toHaveLength(1);
  });
});

describe("fine-grained reactivity", () => {
  it("updating #42 of 10,000 items only re-runs readers of #42", () => {
    const store = createStore(10_000);
    const first = track(() => store.getItem(1)?.data.title);
    const target = track(() => store.getItem(42)?.data.title);

    store.updateField(42, "title", "changed");
    flushSync();

    expect(first.runs).toBe(1);
    expect(target.runs).toBe(2);
  });

  it("only re-runs readers of the field that changed", () => {
    const store = createStore(1);
    const title = track(() => store.getItem(0)?.data.title);
    const priority = track(() => store.getItem(0)?.data.priority);
    const selected = track(() => store.getItem(0)?.isSelected);

    store.updateField(0, "title", "changed");
    flushSync();

    expect(title.runs).toBe(2);
    expect(priority.runs).toBe(1);
    expect(selected.runs).toBe(1);

    store.setIsSelected(0, true);
    flushSync();

    expect(title.runs).toBe(2);
    expect(selected.runs).toBe(2);
  });

  it("does not re-run list readers when a field changes", () => {
    const store = createStore(3);
    const list = track(() => store.state.length);

    store.updateField(1, "title", "changed");
    store.setIsSelected(2, true);
    flushSync();

    expect(list.runs).toBe(1);
  });

  it("re-runs list readers when items are added or removed", () => {
    const store = createStore(3);
    const list = track(() => store.state.length);

    store.addItem(task("new"));
    flushSync();
    expect(list.runs).toBe(2);

    store.removeItem(0);
    flushSync();
    expect(list.runs).toBe(3);
  });

  it("collapses 5 synchronous updates into one re-run", () => {
    const store = createStore(1);
    const reader = track(() => store.getItem(0)?.data.priority);

    for (let i = 1; i <= 5; i++) store.updateField(0, "priority", i);
    flushSync();

    expect(reader.runs).toBe(2);
    expect(store.getItem(0)?.data.priority).toBe(5);
  });

  it("re-runs a row reader with null when its item is removed", () => {
    const store = createStore(2);
    const seen: (string | undefined)[] = [];
    track(() => seen.push(store.getItem(1)?.data.title));

    store.removeItem(1);
    flushSync();

    expect(seen).toEqual(["#1", undefined]);
  });

  it("does not re-run readers of other items on remove", () => {
    const store = createStore(3);
    const other = track(() => store.getItem(0)?.data.title);

    store.removeItem(2);
    flushSync();

    expect(other.runs).toBe(1);
  });
});

describe("sub-array replacement", () => {
  it("re-runs readers of the array, not of sibling fields", () => {
    const store = createStore();
    const id = store.addItem(task("a", 0, ["x", "y"]));
    const title = track(() => store.getItem(id)?.data.title);
    const firstTag = track(() => store.getItem(id)?.data.tags[0]);

    store.updateField(id, "tags", ["a", "b"]);
    flushSync();

    expect(title.runs).toBe(1);
    expect(firstTag.runs).toBe(2);
    expect(store.getItem(id)?.data.tags).toEqual(["a", "b"]);
  });

  it("tracks the new array per index", () => {
    const store = createStore();
    const id = store.addItem(task("a", 0, ["x", "y"]));
    store.updateField(id, "tags", ["a", "b"]);
    const firstTag = track(() => store.getItem(id)?.data.tags[0]);
    const secondTag = track(() => store.getItem(id)?.data.tags[1]);

    store.getItem(id)!.data.tags[1] = "B";
    flushSync();

    expect(firstTag.runs).toBe(1);
    expect(secondTag.runs).toBe(2);
  });
});

describe("derivedFilter", () => {
  it("returns the matching items", () => {
    const store = createStore(5);
    const high = store.derivedFilter((item) => item.data.priority >= 3);

    expect(high.current.map((item) => item.id)).toEqual([3, 4]);
  });

  it("stays up to date through the current getter", () => {
    const store = createStore(3);
    const selected = store.derivedFilter((item) => item.isSelected);
    expect(selected.current).toEqual([]);

    store.setIsSelected(1, true);
    expect(selected.current.map((item) => item.id)).toEqual([1]);

    store.addItem(task("new"));
    store.setIsSelected(3, true);
    expect(selected.current.map((item) => item.id)).toEqual([1, 3]);

    store.removeItem(1);
    expect(selected.current.map((item) => item.id)).toEqual([3]);
  });

  it("picks up an item that starts matching", () => {
    const store = createStore(3);
    const high = store.derivedFilter((item) => item.data.priority >= 10);
    const reader = track(() => high.current.length);

    store.updateField(1, "priority", 10);
    flushSync();

    expect(reader.runs).toBe(2);
    expect(high.current.map((item) => item.id)).toEqual([1]);
  });

  it("does not recompute when a field the predicate ignores changes", () => {
    const store = createStore(100);
    let calls = 0;
    const high = store.derivedFilter((item) => {
      calls++;
      return item.data.priority >= 98;
    });
    const reader = track(() => high.current.length);
    const callsAfterFirstRun = calls;

    store.updateField(99, "title", "changed");
    store.setIsSelected(0, true);
    flushSync();

    expect(reader.runs).toBe(1);
    expect(calls).toBe(callsAfterFirstRun);
  });

  it("recomputes once for 5 synchronous updates", () => {
    const store = createStore(100);
    let passes = 0;
    const high = store.derivedFilter((item) => {
      if (item.id === 0) passes++;
      return item.data.priority >= 98;
    });
    const reader = track(() => high.current.length);

    for (let i = 1; i <= 5; i++) store.updateField(99, "priority", i);
    flushSync();

    expect(reader.runs).toBe(2);
    expect(passes).toBe(2);
    expect(high.current.map((item) => item.id)).toEqual([98]);
  });
});
