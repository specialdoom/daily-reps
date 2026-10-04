### **Daily Frontend Challenge: [Architecture & SSR] Island Hydration Triggers**

> **Focus:** hydrating each island exactly once, on the first of several triggers · **Time box:** ~45 min

#### **Overview**
Islands architectures (Astro, Fresh, Qwik-style resumability) ship server-rendered HTML and hydrate each interactive island lazily: when it scrolls into view, when the browser is idle, or on the first user interaction. Hydrating too early hurts TBT and INP; hydrating twice, or after the island was removed, causes bugs and leaks. You're building the small, DOM-agnostic scheduler that decides *when* an island hydrates.

---

### **Detailed Requirements**

- Implement `function scheduleHydration(island: Island, strategy: Strategy, env: Env): Cancel` (no `any`).
- Use these given types:

```ts
type Strategy =
  | { kind: "load" }
  | { kind: "idle"; timeout?: number }
  | { kind: "visible"; rootMargin?: string }
  | { kind: "interaction"; events?: string[] }; // default ["pointerdown", "focusin"]
  // a Strategy[] is also accepted: hydrate on whichever fires FIRST

type Cancel = () => void;
interface Island { el: Element; hydrate(): void }
interface Env {
  requestIdle(cb: () => void, timeout?: number): () => void;                      // returns cancel
  observeVisible(el: Element, cb: () => void, rootMargin?: string): () => void;   // returns unobserve
  listen(el: Element, event: string, cb: () => void): () => void;                 // returns remove
}
```

- `load` hydrates synchronously; `idle`, `visible` and `interaction` delegate to the matching `Env` method.
- With multiple strategies, `island.hydrate()` is called **exactly once**, on the first trigger that fires.
- As soon as hydration happens, every other pending trigger (idle callback, observer, listeners) is torn down.
- The returned `Cancel` tears down all pending triggers and prevents hydration; it is safe to call more than once.

---

### **Edge Cases & Performance Considerations**

- **Simultaneous triggers:** two triggers fire in the same tick (e.g. `visible` and `idle`); `hydrate` must still run only once.
- **Cancel after hydrate / double cancel:** must be a no-op and must not call any teardown function twice.
- **Throwing `hydrate`:** teardown of the remaining triggers must still happen, and the error must propagate to the caller of the trigger.
- **Stretch:** if `load` is combined with other strategies, don't register the other triggers at all.

---

### **Interactive Next Steps**
- **(A)** Ask for a comprehensive Vitest suite or starter code.
- **(B)** Paste your solution for a review of type accuracy, edge cases and performance.
