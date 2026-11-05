### **Daily Frontend Challenge: [Modern JS/TS] Deep `watch()` with `Proxy`: Stable Identity and the `receiver`**

> **Focus:** wrapping nested objects lazily in a `Proxy` while keeping identity stable (`WeakMap` cache) and `this` correct (`Reflect` + `receiver`) · **Time box:** ~45 min
> **Format:** Library · **Stack:** Bun 1.4 (`bun test`, `bun@1.4.4`) + TypeScript 5.9 (strict)

#### **Overview**
Reactive stores, undo history and "dirty form" trackers all start with the same trick: hand out a `Proxy` that reports every mutation, even deep ones. The naive version wraps nested objects on every read, so `state.user !== state.user`, `Set`-like lookups break, and getters see the wrong `this`. Getting those two details right is the whole job.

---

### **What You'll Learn**

**Core concept:** a deep `Proxy` must hand out one stable proxy per raw object (a `WeakMap` cache) and forward `get`/`set` with the original `receiver` so accessors and inheritance behave.

**By the end you should be able to:**
- explain why `Reflect.get(target, key, receiver)` differs from `target[key]` for getters;
- implement lazy deep wrapping with a `WeakMap` so proxy identity is stable;
- report precise change paths from nested `set` and `deleteProperty` traps;
- avoid double-wrapping and notifications for no-op writes.

**Skills practised:** Proxy traps · Reflect · WeakMap · identity · Bun test

**Prerequisites:** `Proxy` and `Reflect` basics, getters, `WeakMap`.

**Where this shows up in practice:** Vue 2→3 reactivity, Immer drafts, MobX, Valtio.

**Self-check (answer after solving):**
1. Why does the same raw object reached through two paths need the same proxy, and what breaks if it doesn't?
2. What would `this` be inside a getter if you used `target[key]` in the `get` trap?
3. Why must a `set` trap return `true`, and what does a `false` do in strict mode?

---

### **Why Bun?**
Bun ships a runtime, package manager and Jest-compatible test runner in one binary, so a TypeScript library needs no build or config to test. Docs: https://bun.sh/docs/cli/test

---

### **Starter**
Project: `deep-watch/`. Run `cd deep-watch && bun install && bun test` (add your own spec as `src/watch.test.ts`) and `bun run build` for the type check.

```ts
export type Path = readonly (string | symbol)[];
export type OnChange = (path: Path) => void;

export function watch<T extends object>(target: T, onChange: OnChange): T {
  // TODO
  throw new Error("TODO");
}
```

---

### **Detailed Requirements**
- `watch(target, onChange)` returns a proxy; reads and writes go through to `target`.
- After a successful `set` or `deleteProperty`, call `onChange(path)` once, where `path` is the keys from the root, e.g. `["user", "address", "city"]`.
- Plain objects and arrays reached through the proxy are wrapped lazily and recursively. Other values (primitives, functions, `Date`, `Map`, ...) are returned as is.
- Identity is stable: `p.user === p.user`, and the same raw object returns the same proxy every time.
- Forward `receiver` to `Reflect.get`/`Reflect.set`, so a getter such as `get full() { return this.first + " " + this.last }` reads through the proxy.

### **Edge Cases & Performance Considerations**
- Writing a value identical to the current one (`Object.is`) must not notify.
- Assigning a proxy back into the tree (`p.a = p.b`) must store the raw object, not a proxy of a proxy.
- Array `push` triggers several sets (index and `length`); decide and document what is reported, without crashing.

**Stretch:** the same raw object reachable under two paths: report the path used for the write.

---

### **Interactive Next Steps**
- **(A)** Ask for a `bun test` suite for this challenge.
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
