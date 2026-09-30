import { describe, expect, it } from "vitest";
import { createListStore } from "./store.svelte";

// This file runs in the "server" project: runes are compiled for SSR and no DOM exists.
describe("SSR", () => {
  it("runs without browser globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const store = createListStore<{ title: string }>();
    const first = store.addItem({ title: "a" });
    const second = store.addItem({ title: "b" });
    store.updateField(first, "title", "changed");
    store.setIsSelected(second, true);

    expect(store.state.map((item) => item.data.title)).toEqual([
      "changed",
      "b",
    ]);
    expect(
      store.derivedFilter((item) => item.isSelected).current.map((item) => item.id),
    ).toEqual([second]);
  });

  it("produces the same ids for every request, like the browser will", () => {
    const renderRequest = () => {
      const store = createListStore<{ title: string }>();
      return ["a", "b", "c"].map((title) => store.addItem({ title }));
    };

    expect(renderRequest()).toEqual([0, 1, 2]);
    expect(renderRequest()).toEqual([0, 1, 2]);
  });
});
