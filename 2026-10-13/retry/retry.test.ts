// TODO: this file is the bug. Fix the tests, not retry.ts (see ../README.md).
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

    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(200);

    await expect(p).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up after the last retry", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("nope"));

    const p = retry(fn, { retries: 2, baseMs: 100 });
    const throwPromise = expect(p).rejects.toThrow("nope");
    await vi.advanceTimersByTimeAsync(10_000);

    await throwPromise;

    expect(fn).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });
});

/**
 * ROOT CAUSES: 
 * - the advance timers were sync in the first place while dealing with promises that could reject
 * - unhandled rejection error because of the handler was attaching to the promise after timer advance
 * - clearing of the timers between tests
 */