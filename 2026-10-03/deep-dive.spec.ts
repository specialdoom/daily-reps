import { describe, expect, expectTypeOf, it } from "vitest";
import { get, type Path, type PathValue } from "./deep-dive.js";

/**
 * Runtime behaviour is checked by `npm test` (vitest).
 * Type-level behaviour (expectTypeOf, @ts-expect-error) is only checked by the
 * compiler: `npm run typecheck:before-review`. expectTypeOf is a no-op at runtime.
 */

type Demo = {
  user: { name: string; address: { city: string; zip?: string } };
  items: { name: string; tags: string[] }[];
};

type Item = Demo["items"][number];

const demo: Demo = {
  user: { name: "Ada", address: { city: "Paris" } },
  items: [
    { name: "first", tags: ["a", "b"] },
    { name: "second", tags: [] },
  ],
};

type TreeNode = { value: number; children: TreeNode[] };

const tree: TreeNode = {
  value: 1,
  children: [{ value: 2, children: [{ value: 3, children: [] }] }],
};

describe("get (runtime)", () => {
  describe("valid paths", () => {
    it("reads a nested object property", () => {
      expect(get(demo, "user.address.city")).toBe("Paris");
    });

    it("reads a top-level key and returns the same reference", () => {
      expect(get(demo, "user")).toBe(demo.user);
    });

    it("reads an intermediate object path", () => {
      expect(get(demo, "user.address")).toBe(demo.user.address);
    });

    it("indexes arrays with numeric segments", () => {
      expect(get(demo, "items.0.name")).toBe("first");
      expect(get(demo, "items.1.name")).toBe("second");
    });

    it("returns a whole array element", () => {
      expect(get(demo, "items.0")).toBe(demo.items[0]);
    });

    it("indexes nested arrays", () => {
      expect(get(demo, "items.0.tags.1")).toBe("b");
    });

    it("walks a self-referential type", () => {
      expect(get(tree, "children.0.children.0.value")).toBe(3);
    });
  });

  describe("missing values", () => {
    it("returns undefined for an absent optional key", () => {
      expect(get(demo, "user.address.zip")).toBeUndefined();
    });

    it("returns undefined for an out-of-range index", () => {
      expect(get(demo, "items.5")).toBeUndefined();
    });

    it("returns undefined instead of throwing past an out-of-range index", () => {
      expect(() => get(demo, "items.5.name")).not.toThrow();
      expect(get(demo, "items.5.name")).toBeUndefined();
    });

    it("returns undefined instead of throwing when an intermediate value is null", () => {
      const data = { user: null } as unknown as Demo;
      expect(() => get(data, "user.address.city")).not.toThrow();
      expect(get(data, "user.address.city")).toBeUndefined();
    });

    it("returns undefined instead of throwing when an intermediate value is undefined", () => {
      const data = { user: { name: "Ada" } } as unknown as Demo;
      expect(() => get(data, "user.address.city")).not.toThrow();
      expect(get(data, "user.address.city")).toBeUndefined();
    });

    it("returns undefined when the root object itself is null", () => {
      const data = null as unknown as Demo;
      expect(() => get(data, "user.name")).not.toThrow();
      expect(get(data, "user.name")).toBeUndefined();
    });
  });

  describe("falsy leaf values are returned as-is", () => {
    type Falsy = {
      count: number;
      label: string;
      enabled: boolean;
      nickname: string | null;
    };
    const falsy: Falsy = { count: 0, label: "", enabled: false, nickname: null };

    it("keeps 0", () => {
      expect(get(falsy, "count")).toBe(0);
    });

    it("keeps an empty string", () => {
      expect(get(falsy, "label")).toBe("");
    });

    it("keeps false", () => {
      expect(get(falsy, "enabled")).toBe(false);
    });

    it("keeps null (PathValue says `string | null`, so null must not become undefined)", () => {
      expect(get(falsy, "nickname")).toBeNull();
    });
  });

  describe("stretch: tuples", () => {
    type WithPair = { pair: [string, number] };
    const withPair: WithPair = { pair: ["x", 42] };

    it("reads tuple elements by index", () => {
      expect(get(withPair, "pair.0")).toBe("x");
      expect(get(withPair, "pair.1")).toBe(42);
    });
  });
});

describe("get (types)", () => {
  it("infers the README examples exactly", () => {
    expectTypeOf(get(demo, "user.address.city")).toEqualTypeOf<string>();
    expectTypeOf(get(demo, "items.0.name")).toEqualTypeOf<string>();
    expectTypeOf(get(demo, "user.address.zip")).toEqualTypeOf<string | undefined>();
  });

  it("infers intermediate object and array paths", () => {
    expectTypeOf(get(demo, "user")).toEqualTypeOf<Demo["user"]>();
    expectTypeOf(get(demo, "user.address")).toEqualTypeOf<Demo["user"]["address"]>();
    expectTypeOf(get(demo, "items")).toEqualTypeOf<Item[]>();
    expectTypeOf(get(demo, "items.0")).toEqualTypeOf<Item>();
    expectTypeOf(get(demo, "items.0.tags")).toEqualTypeOf<string[]>();
    expectTypeOf(get(demo, "items.0.tags.1")).toEqualTypeOf<string>();
  });

  it("keeps undefined for optional keys and lets paths pass through an optional parent", () => {
    type Opt = { a?: { b: string } };
    const opt: Opt = {};

    expectTypeOf(get(opt, "a")).toEqualTypeOf<{ b: string } | undefined>();
    // `a` may be missing, so the value at `a.b` may be missing too.
    expectTypeOf(get(opt, "a.b")).toEqualTypeOf<string | undefined>();
  });

  it("handles a self-referential type without 'excessively deep' errors", () => {
    expectTypeOf(get(tree, "children.0.value")).toEqualTypeOf<number>();
    expectTypeOf(get(tree, "children.0.children.0.value")).toEqualTypeOf<number>();
  });

  it("rejects invalid paths", () => {
    // @ts-expect-error typo in a key
    get(demo, "user.adress");
    // @ts-expect-error typo in a nested key
    get(demo, "user.address.cty");
    // @ts-expect-error cannot go into a primitive
    get(demo, "user.name.length");
    // @ts-expect-error array methods are not paths
    get(demo, "items.map");
    // @ts-expect-error array length is not a path
    get(demo, "items.length");
    // @ts-expect-error arrays need an index before element fields
    get(demo, "items.name");
    // @ts-expect-error non-numeric index
    get(demo, "items.x.name");
    // @ts-expect-error empty path
    get(demo, "");
    // @ts-expect-error trailing dot
    get(demo, "user.");
  });

  it("stretch: resolves tuple elements to their exact types", () => {
    type WithPair = { pair: [string, number] };
    const withPair: WithPair = { pair: ["x", 42] };

    expectTypeOf(get(withPair, "pair.0")).toEqualTypeOf<string>();
    expectTypeOf(get(withPair, "pair.1")).toEqualTypeOf<number>();
    // @ts-expect-error out of tuple bounds
    get(withPair, "pair.2");
  });
});

describe("Path / PathValue (types)", () => {
  it("Path includes leaf and intermediate paths", () => {
    expectTypeOf<"user">().toExtend<Path<Demo>>();
    expectTypeOf<"user.address">().toExtend<Path<Demo>>();
    expectTypeOf<"user.address.city">().toExtend<Path<Demo>>();
    expectTypeOf<"items.0.tags.1">().toExtend<Path<Demo>>();
  });

  it("Path contains only strings", () => {
    expectTypeOf<Path<Demo>>().toExtend<string>();
  });

  it("PathValue resolves the README examples", () => {
    expectTypeOf<PathValue<Demo, "user.address.city">>().toEqualTypeOf<string>();
    expectTypeOf<PathValue<Demo, "items.0.name">>().toEqualTypeOf<string>();
    expectTypeOf<PathValue<Demo, "user.address.zip">>().toEqualTypeOf<string | undefined>();
  });
});
