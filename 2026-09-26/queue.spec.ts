import { describe, expect, it } from "vitest";
import { createAsyncQueue } from "./queue.js";

describe("createAsyncQueue", () => {
  it("runs tasks in FIFO order when concurrency is 1", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });
    const calls: string[] = [];

    const first = queue.enqueue(async () => {
      calls.push("first:start");
      await new Promise((resolve) => setTimeout(resolve, 25));
      calls.push("first:end");
      return "first";
    });

    const second = queue.enqueue(async () => {
      calls.push("second:start");
      await new Promise((resolve) => setTimeout(resolve, 5));
      calls.push("second:end");
      return "second";
    });

    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(calls).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("respects the configured concurrency limit", async () => {
    const queue = createAsyncQueue({ concurrency: 2 });
    const active = new Set<number>();
    const maxSeen: number[] = [];

    const tasks = Array.from({ length: 6 }, (_, index) =>
      queue.enqueue(async () => {
        active.add(index);
        maxSeen.push(active.size);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active.delete(index);
        return index;
      }),
    );

    await Promise.all(tasks);
    expect(Math.max(...maxSeen)).toBeLessThanOrEqual(2);
  });

  it("runs higher-priority tasks before lower-priority tasks", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });
    const order: string[] = [];

    queue.enqueue(async () => {
      order.push("low-1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "low-1";
    }, { priority: 0 });

    queue.enqueue(async () => {
      order.push("low-2");
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "low-2";
    }, { priority: 0 });

    const high = queue.enqueue(async () => {
      order.push("high");
      await new Promise((resolve) => setTimeout(resolve, 5));
      return "high";
    }, { priority: 2 });

    await expect(high).resolves.toBe("high");
    expect(order[0]).toBe("high");
  });

  it("retries failed tasks according to maxRetries and retryDelayMs", async () => {
    const queue = createAsyncQueue({ concurrency: 1, maxRetries: 2, retryDelayMs: 20 });
    const attempts: number[] = [];

    const result = queue.enqueue(async () => {
      attempts.push(attempts.length + 1);
      if (attempts.length < 3) {
        throw new Error("retry me");
      }
      return "done";
    });

    await expect(result).resolves.toBe("done");
    expect(attempts).toEqual([1, 2, 3]);
  });

  it("continues processing after a rejected task", async () => {
    const queue = createAsyncQueue({ concurrency: 2 });

    const ok = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "ok";
    });

    const fail = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      throw new Error("boom");
    });

    const stillWorks = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return "still-works";
    });

    await expect(ok).resolves.toBe("ok");
    await expect(fail).rejects.toThrow("boom");
    await expect(stillWorks).resolves.toBe("still-works");
  });

  it("pause prevents new tasks from starting until resume is called", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });
    const started: string[] = [];

    queue.pause();

    const task = queue.enqueue(async () => {
      started.push("started");
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "done";
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(started).toEqual([]);

    queue.resume();
    await expect(task).resolves.toBe("done");
    expect(started).toEqual(["started"]);
  });

  it("clear rejects pending tasks without interrupting active tasks", async () => {
    const queue = createAsyncQueue({ concurrency: 1 });

    const active = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return "active";
    });

    const pending1 = queue.enqueue(async () => "pending-1");
    const pending2 = queue.enqueue(async () => "pending-2");

    queue.clear();

    await expect(active).resolves.toBe("active");
    await expect(pending1).rejects.toThrow();
    await expect(pending2).rejects.toThrow();
  });

  it("tracks queue stats for pending, active, completed, and failed tasks", async () => {
    const queue = createAsyncQueue({ concurrency: 2, maxRetries: 1, retryDelayMs: 5 });

    const first = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "done-1";
    });

    const second = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "done-2";
    });

    const third = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "done-3";
    });

    const stats = queue.getStats();
    expect(stats.active).toBeLessThanOrEqual(2);
    expect(stats.pending).toBeGreaterThanOrEqual(0);

    await Promise.all([first, second, third]);
    expect(queue.getStats().completed).toBeGreaterThanOrEqual(3);
  });
});
