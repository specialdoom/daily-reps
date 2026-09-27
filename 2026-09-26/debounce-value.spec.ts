import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedValue } from "./debounce-value.js";

describe("createDebouncedValue", () => {
  let useDebounceValue: ReturnType<typeof createDebouncedValue<string>>;

  beforeEach(() => {
    vi.useFakeTimers();
    useDebounceValue = createDebouncedValue<string>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not resolve before the delay has elapsed", async () => {
    const resolved = vi.fn();
    useDebounceValue("hello", 100).then(resolved);

    await vi.advanceTimersByTimeAsync(50);
    expect(resolved).not.toHaveBeenCalled();
  });

  it("resolves with the value once the delay has elapsed", async () => {
    const promise = useDebounceValue("hello", 100);

    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toBe("hello");
  });

  it("uses a default delay of 300ms when none is provided", async () => {
    const resolved = vi.fn();
    useDebounceValue("hello").then(resolved);

    await vi.advanceTimersByTimeAsync(299);
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalledWith("hello");
  });

  it("keeps only the latest value when called repeatedly before the delay ends", async () => {
    useDebounceValue("a", 100);
    await vi.advanceTimersByTimeAsync(30);
    useDebounceValue("b", 100);
    await vi.advanceTimersByTimeAsync(30);
    const latest = useDebounceValue("c", 100);

    await vi.advanceTimersByTimeAsync(100);
    await expect(latest).resolves.toBe("c");
  });

  it("never resolves a stale call once a newer value cancels its timer", async () => {
    const staleResolved = vi.fn();
    useDebounceValue("a", 100).then(staleResolved);

    await vi.advanceTimersByTimeAsync(50);
    useDebounceValue("b", 100);

    await vi.advanceTimersByTimeAsync(200);
    expect(staleResolved).not.toHaveBeenCalled();
  });

  it("debounces an empty string just like any other value", async () => {
    const promise = useDebounceValue("", 50);

    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toBe("");
  });

  it("still resolves asynchronously (not synchronously) when the delay is 0", async () => {
    const resolved = vi.fn();
    useDebounceValue("q", 0).then(resolved);

    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toHaveBeenCalledWith("q");
  });

  it("resolves immediately when the value matches the last resolved value", async () => {
    const first = useDebounceValue("cat", 100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(first).resolves.toBe("cat");

    const resolvedAgain = vi.fn();
    useDebounceValue("cat", 100).then(resolvedAgain);

    await Promise.resolve();
    expect(resolvedAgain).toHaveBeenCalledWith("cat");
  });

  it("two independent debounced instances do not share timers", async () => {
    const other = createDebouncedValue<string>();

    const p1 = useDebounceValue("first-instance", 100);
    await vi.advanceTimersByTimeAsync(50);
    other("second-instance", 100);

    await vi.advanceTimersByTimeAsync(50);
    await expect(p1).resolves.toBe("first-instance");
  });
});
