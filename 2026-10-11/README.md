### **Daily Frontend Challenge: [Modern JS/TS] Request Deduplication with Ref-Counted `AbortSignal`s**

> **Focus:** sharing one in-flight promise between callers while aborting the underlying work only when *every* caller has aborted · **Time box:** ~45 min
> **Format:** Library / function · **Stack:** vanilla TypeScript (strict) + Vitest

#### **Overview**
Three components mount at once and each asks for `/api/user/42`. You want one network request, not three. The catch is cancellation: if component A unmounts and aborts, the request must keep going for B and C; only when the last interested caller aborts should the real `fetch` be cancelled. Build `createDeduper`, a tiny primitive that shares in-flight work by key and ref-counts the abort signals of its callers.

---

### **Detailed Requirements**

Use these types (given, do not change):

```ts
export type Task<T> = (signal: AbortSignal) => Promise<T>;

export interface Deduper {
  /** Run `task` for `key`, or join the in-flight run for the same key. */
  run<T>(key: string, task: Task<T>, opts?: { signal?: AbortSignal }): Promise<T>;
  /** Number of keys currently in flight. */
  readonly size: number;
}

export function createDeduper(): Deduper;
```

- **Dedupe:** concurrent `run` calls with the same key invoke `task` once and all resolve/reject with the same outcome. Once the work settles, the key is removed, so a later call starts a fresh run (no result caching).
- **Ref-counted abort:** the `AbortSignal` passed to `task` aborts only when every caller that joined has aborted. A caller that aborts gets its own promise rejected immediately with `signal.reason` (or a `DOMException` `AbortError` if there is none); the others are unaffected.
- **Late joiners count:** a caller joining after earlier callers aborted, but before the work was cancelled, keeps the work alive again (the count goes back up).
- **No signal = never cancels:** a caller without a `signal` holds the work open until it settles.
- **Cleanup:** after settle or full abort, `size` drops and no listeners remain attached to caller signals (no leaks on long-lived signals).

---

### **Edge Cases & Performance Considerations**
- A caller whose `signal` is **already aborted** when calling `run` must reject immediately and must not start, or keep alive, the task. If it was the only caller, `task` is never invoked.
- After the shared work was aborted because all callers left, a new `run` with the same key must start a **new** task, not join the dead one, even if the old task has not yet settled.
- Stretch: ensure a task that ignores its signal and resolves late cannot delete the *new* run's entry for the same key.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite or a starter project.
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
