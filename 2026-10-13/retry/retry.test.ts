import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { retry } from "./retry";

describe("retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds after two failures with 100ms then 200ms backoff", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockResolvedValue("ok");

    const p = retry(fn, { retries: 3, baseMs: 100 });
    const resolvesPromise = expect(p).resolves.toBe("ok");

    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
    // 299 ms: the second delay must be 200 ms, not another 100 ms.
    await vi.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await resolvesPromise;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up after the last retry", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockRejectedValueOnce(new Error("c"))
      .mockRejectedValue(new Error("nope"));
    const onSettled = vi.fn();

    const p = retry(fn, { retries: 3, baseMs: 100 });
    const throwPromise = expect(p).rejects.toThrow("nope");
    p.then(onSettled, onSettled);

    // 100 + 200 + 400: the last attempt runs at exactly 700 ms.
    await vi.advanceTimersByTimeAsync(699);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onSettled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(4);
    expect(onSettled).toHaveBeenCalledTimes(1);

    await throwPromise;
    expect(vi.getTimerCount()).toBe(0);
  });
});

/**
 * ROOT CAUSES:
 * - retry() schedules each next setTimeout inside an `await` continuation, which is a
 *   microtask. The sync vi.advanceTimersByTime() returns before that microtask runs, so it
 *   advanced a clock with no timers and the loop stalled until the 5 s test timeout.
 *   advanceTimersByTimeAsync() flushes microtasks between timer steps, so each next timer
 *   exists before the clock reaches it.
 * - The first test turned fake timers on but never restored them, and the second test never
 *   turned them on at all. The second test only "worked" because of the leak, which is why it
 *   fails alone with "Timers are not mocked". beforeEach/afterEach makes each test own its timers.
 * - The `expect(p).rejects` handler was attached after advancing the clock, so p rejected while
 *   nothing was listening, which is an unhandled rejection. The handler must be attached before the clock moves.
 * - runAllTimersAsync() would also work here because retry() stops after `retries`, but polling
 *   code that reschedules itself forever never runs out of timers, and it hits the fake-timer loop limit.
 */
