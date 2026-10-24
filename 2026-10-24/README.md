### **Daily Frontend Challenge: [Testing & Tooling] A Virtual Module Done Right: `resolveId`, `load` and the `\0` Prefix**

> **Focus:** serving a virtual module from a Vite plugin (`resolveId` + `load`, the `\0` convention) · **Time box:** ~40 min
> **Format:** Library · **Stack:** Vite 8 plugin API (`vite@8.3.5`) + TypeScript (strict) + Vitest 5 (`vitest@5.0.5`)

#### **Overview**
Many build-time values (feature flags, API URLs, build metadata) are injected through a virtual module such as `virtual:app-config`. A careless plugin leaks the module into other plugins' transforms, breaks on query strings, or emits invalid JavaScript for odd keys. Writing a small, correct virtual-module plugin is the best way to learn how Vite's plugin pipeline resolves and loads ids.

---

### **What You'll Learn**

**Core concept:** a virtual module has no file on disk, so the plugin must claim the import in `resolveId`, hand back a *different* internal id, and produce the code in `load`. The internal id starts with `\0` so other plugins leave it alone.

**By the end you should be able to:**
- explain why `resolveId` returns `"\0" + id` instead of the id the user wrote;
- implement `resolveId` and `load` so they only react to their own module;
- generate valid ESM (named + default exports) from arbitrary data;
- test plugin hooks directly, without starting Vite.

**Skills practised:** Vite plugin hooks · module resolution · code generation · unit-testing tooling

**Prerequisites:** ES module syntax; basic idea of a bundler plugin.

**Where this shows up in practice:** `virtual:pwa-register`, `virtual:uno.css`, `astro:content`, route manifests in meta-frameworks; Rollup's `@rollup/plugin-virtual` is the same pattern.

**Self-check (answer after solving):**
1. What goes wrong in `@vitejs/plugin-react` or an `import.meta.glob` transform if your internal id has no `\0`?
2. Why does `load` return `null` for ids it doesn't own, rather than `""`?
3. Why must `getData` be called in `load` and not once when the plugin is created?

---

### **Starter**
The project lives in [`virtual-config/`](./virtual-config). Run it with `cd virtual-config && npm install && npm test` (no tests are provided; add your own, or ask via Next Step A). `npm run build` type-checks.

`src/virtualJson.ts` contains `RESERVED_WORDS`, the `IDENTIFIER` regex and a stub:

```ts
import type { Plugin } from "vite";

export const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
export const RESERVED_WORDS: ReadonlySet<string> = /* provided */;

export function virtualJson(
  id: string,
  getData: () => Record<string, unknown>,
): Plugin {
  // TODO
  throw new Error("TODO");
}
```

---

### **Detailed Requirements**
- `virtualJson("virtual:app-config", () => ({ apiUrl: "/api", debug: false }))` returns a Vite `Plugin` with a `name` that contains the module id.
- `resolveId(source)` returns `"\0" + id` when `source === id`, and `null` for anything else (including `id + "?raw"` and unrelated ids).
- `load(loadId)` returns code only when `loadId === "\0" + id`, otherwise `null`.
- The generated code has a **default export** with the whole object, plus a **named export** for each key that is a valid identifier and not in `RESERVED_WORDS`. Values are serialised with `JSON.stringify`.
- `getData` is called on every `load`, so changed data is reflected the next time the module is loaded.

Example output for `{ apiUrl: "/api", debug: false }`:

```js
export const apiUrl = "/api";
export const debug = false;
export default {"apiUrl":"/api","debug":false};
```

Test by calling the hooks yourself, e.g. `(plugin.resolveId as Function).call({}, "virtual:app-config")`, and by importing the generated code as a string (a `data:` URL import works for a smoke test).

---

### **Edge Cases & Performance Considerations**
- Keys such as `"my-key"`, `"2fast"` and `"class"` must not produce named exports (they would be syntax errors), but must remain in the default export.
- Values containing `</script>`, quotes, newlines or ` ` must round-trip exactly.
- A `getData` that returns `undefined` for a key: `JSON.stringify(undefined)` is not a valid expression, so decide and document how you handle it (skip the named export, keep the default object consistent).

**Stretch goal:** make the module hot-reloadable. Add `configureServer` so that when the data changes, you invalidate `"\0" + id` in `server.moduleGraph` and trigger an update.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite for this plugin.
- **(B)** Paste your solution for a review of correctness, edge cases and code generation.
