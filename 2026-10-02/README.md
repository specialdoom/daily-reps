### **Daily Frontend Challenge: [Testing & Tooling] Deterministic Fake Clock for Timer-Based Code**

> **Focus:** a virtual clock that fires timers in exact order · **Time box:** ~45 min

#### **Overview**
Flaky frontend tests almost always come from real time: debounces, retries and polling that depend on `setTimeout`. Vitest and Jest ship fake timers, but staff-level engineers should know how they work: a virtual clock with an ordered timer queue that runs callbacks, including ones scheduled by other callbacks, at the correct virtual instant. You're building that core as a small, injectable clock.

---

### **Detailed Requirements**
Implement `createFakeClock` with this strict API:

```ts
export type TimerId = number;

export interface FakeClock {
  now(): number;                                             // virtual ms, starts at `start`
  setTimeout(fn: () => void, delay: number): TimerId;
  setInterval(fn: () => void, delay: number): TimerId;
  clear(id: TimerId): void;                                  // works for both timeouts and intervals
  advance(ms: number): void;                                 // run everything due in (now, now + ms]
}

export function createFakeClock(start?: number): FakeClock;  // start defaults to 0
```

- `advance(ms)` runs due timers in order of due time, with ties broken by creation order (FIFO).
- While a callback runs, `now()` returns that timer's due time, not the end of the `advance` window. After `advance` returns, `now()` equals `start + total advanced`.
- Timers scheduled inside a callback are honored in the same `advance` call if they fall inside the window.
- `setInterval` reschedules itself at `due + delay` after each run (no drift).
- Negative or non-finite delays are treated as `0`; `advance` with a negative value throws a `RangeError`.

---

### **Edge Cases & Performance Considerations**
- A callback that calls `clear` on another timer due at the same instant must prevent it from running; an interval that clears itself must not fire again.
- `setInterval(fn, 0)` would loop forever: clamp the interval to a minimum of 1 ms so `advance` terminates.
- Use a structure with O(log n) insertion and removal of the next timer (a binary heap) rather than re-sorting an array on every schedule.

**Stretch goal:** add `runAll(limit = 10_000)` that drains the queue and throws if the limit is exceeded (runaway interval detection).

---

### **Interactive Next Steps**
- **(A)** Ask for a comprehensive Vitest suite or starter code.
- **(B)** Paste your solution for a review of type accuracy, edge cases and performance.
