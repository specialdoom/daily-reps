### **Daily Frontend Challenge: [Modern JS/TS] Type-Safe Deep Path Getter**

> **Focus:** recursive template-literal types for dotted object paths · **Time box:** ~45 min

#### **Overview**
Form libraries, state stores and i18n tools all accept string paths like `"user.address.city"` or `"items.0.name"`. Untyped, a typo silently returns `undefined`. With recursive conditional and template-literal types, the compiler can reject bad paths and infer the exact value type at each path. You're building that type machinery plus a tiny runtime getter.

---

### **Detailed Requirements**

- Implement `type Path<T>`: the union of all valid dotted paths into `T`, including intermediate object paths (e.g. `"user"` and `"user.address"`).
- Implement `type PathValue<T, P extends Path<T>>`: the type found at path `P`.
- Implement `function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P>` (no `any` in the public signature).
- Arrays are indexed with numeric segments: for `items: { name: string }[]`, `"items.0.name"` is valid and resolves to `string`.
- Provide `// @ts-expect-error` assertions (or Vitest `expectTypeOf`) proving that invalid paths such as `"user.adress"` fail to compile.

```ts
type Demo = {
  user: { name: string; address: { city: string; zip?: string } };
  items: { name: string; tags: string[] }[];
};

get(demo, "user.address.city");  // string
get(demo, "items.0.name");       // string
get(demo, "user.address.zip");   // string | undefined
```

---

### **Edge Cases & Performance Considerations**

- **Optional properties:** `PathValue` must keep `undefined` for optional keys, and paths through an optional parent must still type-check.
- **Recursion limits:** a self-referential type (e.g. a tree node with `children: Node[]`) makes `Path<T>` infinite. Add a depth limit (e.g. 5) so the compiler doesn't hit "type instantiation is excessively deep".
- **Runtime safety:** `get` must return `undefined` instead of throwing when an intermediate value is `null` or `undefined`.
- **Stretch:** support tuples, so `"pair.1"` resolves to the exact element type.

---

### **Interactive Next Steps**
- **(A)** Ask for a comprehensive Vitest suite or starter code.
- **(B)** Paste your solution for a review of type accuracy, edge cases and performance.
