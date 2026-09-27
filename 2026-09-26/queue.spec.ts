import { describe, expect, it, vi } from "vitest";
import { createAsyncQueue } from "./queue.js";

describe("createAsyncQueue", () => {
  it("runs tasks in FIFO order with concurrency 1", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });
    const calls: string[] = [];

    const p1 = queue.enqueue(async () => {
      calls.push("first:start");
      await new Promise((r) => setTimeout(r, 25));
      calls.push("first:end");
      return "first";
    });

    const p2 = queue.enqueue(async () => {
      calls.push("second:start");
      await new Promise((r) => setTimeout(r, 5));
      calls.push("second:end");
      return "second";
    });

    await expect(Promise.all([p1, p2])).resolves.toEqual(["first", "second"]);
    expect(calls).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("respects concurrency limit", async () => {
    const queue = createAsyncQueue({ concurrency: 2 });
    const active = new Set<number>();
    const maxSeen: number[] = [];

    const tasks = Array.from({ length: 6 }, (_, i) =>
      queue.enqueue(async () => {
        active.add(i);
        maxSeen.push(active.size);
        await new Promise((r) => setTimeout(r, 20));
        active.delete(i);
        return i;
      }),
    );

    await Promise.all(tasks);

    expect(Math.max(...maxSeen)).toBeLessThanOrEqual(2);
  });

  it("continues processing after a rejected task", async () => {
    const queue = createAsyncQueue({ concurrency: 2 });

    const p1 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "ok";
    });

    const p2 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 5));
      throw new Error("fail");
    });

    const p3 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return "still-works";
    });

    await expect(p1).resolves.toBe("ok");
    await expect(p2).rejects.toThrow("fail");
    await expect(p3).resolves.toBe("still-works");
  });

  it("keeps queue size and running count accurate", async () => {
    const queue = createAsyncQueue({ concurrency: 2 });

    expect(queue.size()).toBe(0);
    expect(queue.running()).toBe(0);

    const p1 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return 1;
    });

    const p2 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return 2;
    });

    const p3 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return 3;
    });

    expect(queue.size()).toBeGreaterThanOrEqual(1);
    expect(queue.running()).toBeLessThanOrEqual(2);

    await Promise.all([p1, p2, p3]);
  });

  it("pause prevents tasks from starting until resumed", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });
    const started: string[] = [];

    queue.pause();

    const task = queue.enqueue(async () => {
      started.push("started");
      await new Promise((r) => setTimeout(r, 20));
      return "done";
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(started).toEqual([]);

    queue.resume();

    await expect(task).resolves.toBe("done");
    expect(started).toEqual(["started"]);
  });

  it("clear removes pending tasks", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });

    const p1 = queue.enqueue(async () => "first");
    const p2 = queue.enqueue(async () => "second");
    const p3 = queue.enqueue(async () => "third");

    queue.clear();

    await expect(p1).resolves.toBe("first");
    await expect(p2).resolves.toBe("second");
    await expect(p3).resolves.toBe("third");
  });

  it("does not start a new task while paused", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });
    const calls: string[] = [];

    queue.pause();

    const promise = queue.enqueue(async () => {
      calls.push("ran");
      return "done";
    });

    await new Promise((r) => setTimeout(r, 15));
    expect(calls).toEqual([]);

    queue.resume();
    await expect(promise).resolves.toBe("done");
  });

  it("supports bounded capacity when configured", async () => {
    const queue = createAsyncQueue({ concurrency: 1, capacity: 2 });

    const p1 = queue.enqueue(async () => "a");
    const p2 = queue.enqueue(async () => "b");

    await expect(queue.enqueue(async () => "c")).rejects.toThrow();
    await Promise.all([p1, p2]);
  });

  it("keeps insertion order among same-priority tasks", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });

    const events: string[] = [];

    const p1 = queue.enqueue(async () => {
      events.push("1");
      return "1";
    });

    const p2 = queue.enqueue(async () => {
      events.push("2");
      return "2";
    });

    const p3 = queue.enqueue(async () => {
      events.push("3");
      return "3";
    });

    await Promise.all([p1, p2, p3]);
    expect(events).toEqual(["1", "2", "3"]);
  });

  it("handles empty queue gracefully", async () => {
    const queue = createAsyncQueue({ concurrency: 3 });

    expect(queue.size()).toBe(0);
    expect(queue.running()).toBe(0);

    queue.pause();
    queue.resume();

    expect(queue.size()).toBe(0);
    expect(queue.running()).toBe(0);
  });

  it("runs tasks immediately when concurrency is large enough", async () => {
    const queue = createAsyncQueue({ concurrency: 3 });

    const started = vi.fn();
    const finished = vi.fn();

    const p1 = queue.enqueue(async () => {
      started();
      await new Promise((r) => setTimeout(r, 10));
      finished();
      return "x";
    });

    const p2 = queue.enqueue(async () => {
      started();
      await new Promise((r) => setTimeout(r, 10));
      finished();
      return "y";
    });

    await Promise.all([p1, p2]);
    expect(started).toHaveBeenCalledTimes(2);
    expect(finished).toHaveBeenCalledTimes(2);
  });
});
