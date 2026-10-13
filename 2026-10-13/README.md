### **Daily Frontend Challenge: [Testing & Tooling] The Retry Test That Passes Alone and Hangs in CI**

> **Focus:** driving promise-based timers with Vitest fake timers (`advanceTimersByTimeAsync`) · **Time box:** ~40 min
> **Format:** Debug / review · **Stack:** vanilla TypeScript (strict) + Vitest 3 (`vi.useFakeTimers`)

#### **Overview**
A teammate wrote `retry()`, a small helper with exponential backoff, and a test for it. The test either times out after 5 seconds or passes only when it is the sole test in the file. The team's reaction is to bump the timeout and add `--retry=2` in CI. Your job is to find the real root cause, fix the test (not the helper), and explain why fake timers and promises interact the way they do.

---

### **What You'll Learn**

**Core concept:** fake timers only move the clock. Awaiting code that schedules the *next* timer after a promise settles needs the async variants, which flush microtasks between timer steps.

**By the end you should be able to:**
- explain why `vi.advanceTimersByTime` cannot progress a loop that schedules its next `setTimeout` inside an `await` continuation;
- fix the test using `vi.advanceTimersByTimeAsync` or `vi.runAllTimersAsync`;
- avoid unhandled-rejection noise by attaching the assertion before the rejection happens;
- guarantee fake timers never leak between tests.

**Skills practised:** Vitest fake timers · microtask vs. timer queue · exponential backoff · test isolation

**Prerequisites:** the event loop (microtasks vs. macrotasks), `async/await`, basic Vitest.

**Where this shows up in practice:** retry/backoff in API clients, polling hooks and debounced search, tested with Jest's `advanceTimersByTimeAsync` or Sinon's `tickAsync`.

**Self-check (answer after solving):**
1. At the moment you call `vi.advanceTimersByTime(1000)`, which timers exist? Which one is created only *after* it?
2. Why does the test pass when run alone but hang when another test ran before it?
3. Why is `await expect(p).rejects...` placed *after* advancing the clock a risk?

---

### **Starter**

Ready to run in `retry/`: `cd retry && npm install && npm test`. It has the two files below, pinned to Vitest 3.2.7 and TypeScript 7.0.2, and `npm test` fails exactly as described in **Symptoms**.

`retry.ts` (correct, do not change):

```ts
export async function retry<T>(
  fn: () => Promise<T>,
  { retries, baseMs }: { retries: number; baseMs: number },
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = baseMs * 2 ** attempt; // 100, 200, 400...
      attempt++;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

`retry.test.ts` (buggy):

```ts
import { describe, it, expect, vi } from 'vitest';
import { retry } from './retry';

describe('retry', () => {
  it('succeeds after two failures with 100ms then 200ms backoff', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue('ok');

    const p = retry(fn, { retries: 3, baseMs: 100 });

    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(200);

    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('gives up after the last retry', async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('nope'));

    const p = retry(fn, { retries: 2, baseMs: 100 });
    vi.advanceTimersByTime(10_000);

    await expect(p).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

**Symptoms** (checked with Vitest 3.2.7):
- `npm test`: both tests time out (`Test timed out in 5000ms`). The first never resolves; the second inherits the fake timers the first test left on.
- `npx vitest run -t "gives up"`: the second test fails immediately with `Timers are not mocked. Try calling "vi.useFakeTimers()" first.` On its own it never had fake timers. It only "had" them before because of test order.

---

### **Detailed Requirements**
- Identify and write down the root cause(s) in 3–5 sentences. There is more than one defect in the test file.
- Rewrite `retry.test.ts` so both tests are deterministic and finish in a few milliseconds of real time.
- Assert the exact schedule: after `99 ms` only 1 call has happened, after `100 ms` 2 calls, after `300 ms` 3 calls. Use `vi.getTimerCount()` to prove no timers are left over.
- Make isolation explicit: restore real timers after each test (`afterEach`), without relying on test order.

### **Acceptance Criteria**
- `npx vitest run` is green and takes well under a second, with the default timeout and no `--retry`.
- Tests pass in any order (`--sequence.shuffle`) and in isolation (`-t`).
- No unhandled rejection warnings in the output.

---

### **Edge Cases & Performance Considerations**
- A rejection that happens while no handler is attached yet: where must `expect(p).rejects` be attached relative to advancing the clock?
- Why `runAllTimersAsync` is acceptable here but dangerous for polling code that reschedules itself forever.
- **Stretch:** add a `jitter` option that uses `Math.random()`, and test it deterministically by stubbing the random source.

---

### **Interactive Next Steps**
- **(A)** Ask for a hint on the event-loop order, or for an extra test case (e.g. for the jitter stretch).
- **(B)** Paste your fixed test file for a review of determinism and isolation.
