### **Daily Frontend Challenge: [Modern JS/TS] Two Tabs, One Balance: A Keyed Async Mutex**

> **Focus:** serializing async critical sections per key with a promise chain (FIFO, release on error, no leaked state) · **Time box:** ~40 min
> **Format:** Library · **Stack:** vanilla TypeScript 5.9 (strict) + Vitest 5 (`vitest@5.1.0`), Node 22

#### **Overview**
A client-side sync layer does read-modify-write on records: `const doc = await load(id); doc.count++; await save(id, doc);`. JavaScript is single-threaded, but every `await` is a gap where another caller for the same `id` can interleave, so two quick updates both read `count = 0` and one increment is lost. You will build a tiny per-key mutex so updates to the same record run one at a time while other records stay fully parallel.

---

### **What You'll Learn**

**Core concept:** `await` is a yield point, not a lock. Mutual exclusion over async code is a queue, and the easiest queue is a chain of promises per key.

**By the end you should be able to:**
- reproduce a lost update caused by interleaved `await`s
- implement a FIFO async mutex with a promise chain
- explain why a rejected task must not break the chain, and how to still report its error to its own caller
- clean up per-key state so a long-lived app does not leak one entry per key ever used

**Skills practised:** promise chaining · microtask ordering · error isolation · `Map` lifecycle

**Prerequisites:** `async`/`await`, how `.then` chains settle.

**Where this shows up in practice:** IndexedDB or localStorage read-modify-write, token refresh single-flight, serialising saves per document, `navigator.locks` (which does this across tabs).

**Self-check (answer after solving):**
1. Why is `if (!busy) { busy = true; await work(); busy = false }` not a mutex?
2. What happens to every later caller if one task rejects and you chain with plain `.then(fn)`?
3. When exactly is it safe to delete a key's entry from the map?

---

### **Starter**
Project: `keyed-mutex/`. Run with `cd keyed-mutex && npm install && npm run check` (add your own tests, or ask for a suite via Next Step A and run `npm test`).

```ts
export class KeyedMutex {
  run<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
    // TODO
    throw new Error("TODO");
  }

  isLocked(key: string): boolean {
    // TODO
    throw new Error("TODO");
  }
}
```

The bug it fixes:

```ts
const db = new Map<string, number>([["a", 0]]);
const tick = () => new Promise((r) => setTimeout(r, 1));

async function increment(key: string) {
  const value = db.get(key)!;
  await tick(); // simulated storage latency
  db.set(key, value + 1);
}

await Promise.all([increment("a"), increment("a"), increment("a")]);
console.log(db.get("a")); // 1, expected 3
```

---

### **Detailed Requirements**
- `run(key, fn)` starts `fn` only after all earlier `run` calls with the same key have settled (fulfilled or rejected). Order is FIFO.
- Calls with different keys never wait for each other.
- The returned promise settles with `fn`'s result or error. `fn` may be sync or async, and may throw synchronously.
- A rejection or throw in one task must not prevent later tasks on that key from running.
- `isLocked(key)` is `true` from the moment `run` is called until the last queued task for that key has settled, and `false` afterwards. No per-key state may remain once a key is idle.

### **Edge Cases & Performance Considerations**
- A task that throws synchronously, and one that rejects after an `await`: the next task still runs, and only the failing caller sees the error.
- Re-using a key after it went idle (entry cleaned up) must work, and a key that gets new work while the previous task is finishing must not be deleted by the old task's cleanup.
- Call `run` for the same key from inside a running task and `await` it: that deadlocks. Decide what you document (no need to fix it).
- Stretch: add an optional `AbortSignal` so a queued (not yet started) task can be cancelled without running.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite (including the lost-update scenario and an error-in-the-middle test).
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
