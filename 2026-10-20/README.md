### **Daily Frontend Challenge: [Modern JS/TS] The Async Generator That Leaks Its Subscription**

> **Focus:** cleanup of an async generator on early exit (`break` / `return` / `throw`) with `try`/`finally` · **Time box:** ~35 min
> **Format:** Debug / review · **Stack:** vanilla TypeScript (strict), Node 22+ (`--experimental-strip-types`)

#### **Overview**
A price widget wraps a push-based feed in an async generator so the UI can write `for await (const price of watchPrice(feed, "ACME"))` and stop as soon as it has what it needs. In production the feed's listener count only ever grows: every widget that stops early leaves its listener behind, and the socket layer slowly drowns in dead callbacks. The bug is one misplaced line, but fixing it properly means knowing exactly what the runtime does to a suspended generator.

---

### **What You'll Learn**

**Core concept:** An async generator only runs its cleanup on early exit if that cleanup sits in a `finally` block, because `break`/`return` in `for await` resumes the generator with a *return completion* at the suspended `yield`.

**By the end you should be able to:**
- Explain what `for await` calls on the iterator when the loop body `break`s, returns or throws.
- Find why code after an infinite loop in a generator never runs, and fix it with `try`/`finally`.
- Prove the fix with a listener count instead of by eye.
- Explain why a manual `it.return()` can be delayed while a `next()` is still pending.

**Skills practised:** async iterators · generator return completions · resource cleanup · push-to-pull adapters

**Prerequisites:** `async function*`, `for await…of`, `try`/`finally`.

**Where this shows up in practice:** WebSocket/SSE wrappers, `fetch` body readers, file watchers, DB cursors. Any `AsyncIterable` over a resource, including `ReadableStream` iteration (`for await` over a stream releases its reader the same way).

**Self-check (answer after solving):**
1. Which method does `for await` call on the iterator when you `break`, and where inside the generator body does execution resume?
2. Why does the line after `while (true)` never run, and what happens to `finally` blocks when the consumer throws inside the loop?
3. If a consumer calls `it.return()` while a `next()` is awaiting, when does your cleanup run, and how would you make it run immediately?

---

### **Starter**
The project is in [`price-feed/`](./price-feed): `cd price-feed && npm install && npm run demo`.

`src/feed.ts` is given (a push-based `Feed` and an in-memory `createFakeFeed()` that exposes `listenerCount`). The buggy code is `src/prices.ts`:

```ts
export async function* watchPrice(feed: Feed, symbol: string): AsyncGenerator<number> {
  const queue: Tick[] = [];
  let wake: (() => void) | undefined;

  const unsubscribe = feed.subscribe((tick) => {
    if (tick.symbol !== symbol) return;
    queue.push(tick);
    wake?.();
  });

  while (true) {
    while (queue.length > 0) {
      yield queue.shift()!.price;
    }
    await new Promise<void>((resolve) => {
      wake = resolve;
    });
  }

  unsubscribe();
}
```

`src/demo.ts` takes the first price above 100 and returns early. **Symptom:** it prints `listeners still subscribed: 1`; it should print `0`.

---

### **Detailed Requirements**
- Find the root cause and explain it in 2–3 sentences (put it in a comment above the fix).
- Fix `watchPrice` so the feed listener is removed on every way out: the consumer `break`s, returns, throws inside the loop, or calls `it.return()` after at least one `next()`.
- Keep the signature `watchPrice(feed: Feed, symbol: string): AsyncGenerator<number>` and the ordering of ticks unchanged.
- `unsubscribe` must be called exactly once per generator, never before the first `next()` (the subscription starts lazily, as today).
- Extend `src/demo.ts` (or add a second script) to show `listenerCount` back at `0` for the `break`, `throw` and `return()` cases.

### **Acceptance Criteria**
- `npm run typecheck` passes with no `any`.
- `npm run demo` prints `listeners still subscribed: 0`.
- Your extra demo shows `0` after an early `break`, after a `throw` in the loop body, and after `await it.return()`.
- Iterating to a natural end (if you add a termination condition) also leaves `0` listeners.

---

### **Edge Cases & Performance Considerations**
- A generator that is created but never iterated has not subscribed yet, so there is nothing to clean up. Make sure your fix does not subscribe eagerly.
- `await it.return()` while a `next()` is still pending is queued behind that `next()`: cleanup waits for the next tick. Reproduce it and decide whether that is acceptable.
- Unbounded `queue` growth while the consumer is slow: note it, don't solve it.

**Stretch goal:** make `it.return()` release the listener immediately even while a `next()` is pending (hint: who else could resolve the pending wait?).

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite that asserts `listenerCount` for each exit path.
- **(B)** Paste your solution for a review of correctness, edge cases and cleanup guarantees.
