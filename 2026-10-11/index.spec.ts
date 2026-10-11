import { describe, expect, it, vi } from "vitest";
import { createDeduper } from "./index.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A task whose settling the test controls, and which records what it was given. */
function controlledTask<T = string>() {
  const d = deferred<T>();
  const signals: AbortSignal[] = [];
  const task = vi.fn((signal: AbortSignal) => {
    signals.push(signal);
    return d.promise;
  });
  return { task, signals, resolve: d.resolve, reject: d.reject };
}

/** An AbortController whose signal counts the `abort` listeners currently attached. */
function trackedController() {
  const controller = new AbortController();
  const { signal } = controller;
  const listeners = new Set<unknown>();
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = ((type: string, listener: any, options?: any) => {
    if (type === "abort") {
      const once = typeof options === "object" && options?.once;
      listeners.add(listener);
      if (once) add(type, () => listeners.delete(listener), { once: true });
    }
    return add(type, listener, options);
  }) as typeof signal.addEventListener;
  signal.removeEventListener = ((type: string, listener: any, options?: any) => {
    if (type === "abort") listeners.delete(listener);
    return remove(type, listener, options);
  }) as typeof signal.removeEventListener;
  return { controller, signal, listenerCount: () => listeners.size };
}

/** Let every pending promise reaction run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Settled state of a promise right now, without waiting for it. */
async function stateOf(promise: Promise<unknown>) {
  const pending = Symbol("pending");
  return Promise.race([promise, Promise.resolve(pending)]).then(
    (value) => (value === pending ? "pending" : "fulfilled"),
    () => "rejected",
  );
}

// Vitest fails the run on any unhandled rejection, so every test also checks for those.

describe("dedupe", () => {
  it("invokes the task once for concurrent calls and gives every caller the same value", async () => {
    const deduper = createDeduper();
    const { task, resolve } = controlledTask<{ id: number }>();

    const a = deduper.run("user", task);
    const b = deduper.run("user", task);
    const c = deduper.run("user", task);
    expect(deduper.size).toBe(1);

    const user = { id: 42 };
    resolve(user);

    expect(await a).toBe(user);
    expect(await b).toBe(user);
    expect(await c).toBe(user);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("ignores the task of a caller that joins", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();

    const a = deduper.run("k", first.task);
    const b = deduper.run("k", second.task);
    first.resolve("first");

    expect(await a).toBe("first");
    expect(await b).toBe("first");
    expect(second.task).not.toHaveBeenCalled();
  });

  it("rejects every caller with the same error when the task fails", async () => {
    const deduper = createDeduper();
    const { task, reject } = controlledTask();
    const error = new Error("network");

    const a = deduper.run("k", task);
    const b = deduper.run("k", task);
    reject(error);

    await expect(a).rejects.toBe(error);
    await expect(b).rejects.toBe(error);
  });

  it("keeps separate keys separate and counts them in size", async () => {
    const deduper = createDeduper();
    const one = controlledTask();
    const two = controlledTask();

    const a = deduper.run("one", one.task);
    const b = deduper.run("two", two.task);
    expect(deduper.size).toBe(2);

    one.resolve("1");
    await a;
    await flush();
    expect(deduper.size).toBe(1);

    two.resolve("2");
    await b;
    await flush();
    expect(deduper.size).toBe(0);
  });

  it("removes the key once the work settles, so a later call starts a fresh run", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();

    const a = deduper.run("k", first.task);
    first.resolve("old");
    expect(await a).toBe("old");
    await flush();
    expect(deduper.size).toBe(0);

    const b = deduper.run("k", second.task);
    expect(second.task).toHaveBeenCalledTimes(1);
    second.resolve("new");
    expect(await b).toBe("new");
  });

  it("removes the key when the task fails", async () => {
    const deduper = createDeduper();
    const { task, reject } = controlledTask();

    const a = deduper.run("k", task);
    reject(new Error("boom"));
    await expect(a).rejects.toThrow("boom");
    await flush();

    expect(deduper.size).toBe(0);
  });

  it("removes the key before a caller's continuation can run", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();

    const a = deduper.run("k", first.task);
    first.resolve("old");
    await a;

    // The caller reacts to its result straight away (e.g. a refetch).
    const b = deduper.run("k", second.task);
    expect(second.task).toHaveBeenCalledTimes(1);
    second.resolve("new");
    expect(await b).toBe("new");
  });
});

describe("ref-counted abort", () => {
  it("rejects only the aborting caller, immediately, and keeps the work going", async () => {
    const deduper = createDeduper();
    const { task, signals, resolve } = controlledTask();
    const a = new AbortController();
    const b = new AbortController();

    const pa = deduper.run("k", task, { signal: a.signal });
    const pb = deduper.run("k", task, { signal: b.signal });
    pa.catch(() => {});

    a.abort();

    expect(await stateOf(pa)).toBe("rejected");
    expect(await stateOf(pb)).toBe("pending");
    expect(signals[0].aborted).toBe(false);
    expect(deduper.size).toBe(1);

    resolve("value");
    expect(await pb).toBe("value");
  });

  it("aborts the task's signal only when every caller has aborted", async () => {
    const deduper = createDeduper();
    const { task, signals } = controlledTask();
    const controllers = [new AbortController(), new AbortController(), new AbortController()];
    const promises = controllers.map((c) => deduper.run("k", task, { signal: c.signal }));
    promises.forEach((p) => p.catch(() => {}));

    controllers[1].abort();
    expect(signals[0].aborted).toBe(false);
    controllers[2].abort();
    expect(signals[0].aborted).toBe(false);
    controllers[0].abort();

    expect(signals[0].aborted).toBe(true);
    expect(deduper.size).toBe(0);
    for (const p of promises) expect(await stateOf(p)).toBe("rejected");
  });

  it("rejects with the caller's own abort reason", async () => {
    const deduper = createDeduper();
    const { task } = controlledTask();
    const a = new AbortController();
    const reason = new Error("unmounted");

    const pa = deduper.run("k", task, { signal: a.signal });
    a.abort(reason);

    await expect(pa).rejects.toBe(reason);
  });

  it("rejects with an AbortError DOMException when no reason was given", async () => {
    const deduper = createDeduper();
    const { task } = controlledTask();
    const a = new AbortController();

    const pa = deduper.run("k", task, { signal: a.signal });
    a.abort();

    const error = await pa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("counts a late joiner, so the work survives the earlier callers leaving", async () => {
    const deduper = createDeduper();
    const { task, signals, resolve } = controlledTask();
    const a = new AbortController();
    const b = new AbortController();
    const c = new AbortController();

    const pa = deduper.run("k", task, { signal: a.signal });
    const pb = deduper.run("k", task, { signal: b.signal });
    pa.catch(() => {});
    pb.catch(() => {});

    a.abort();
    const pc = deduper.run("k", task, { signal: c.signal });
    b.abort();

    expect(task).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(false);
    expect(deduper.size).toBe(1);

    resolve("value");
    expect(await pc).toBe("value");
  });

  it("never cancels while a caller without a signal is waiting", async () => {
    const deduper = createDeduper();
    const { task, signals, resolve } = controlledTask();
    const a = new AbortController();

    const pa = deduper.run("k", task, { signal: a.signal });
    const pb = deduper.run("k", task);
    pa.catch(() => {});

    a.abort();

    expect(signals[0].aborted).toBe(false);
    expect(deduper.size).toBe(1);
    resolve("value");
    expect(await pb).toBe("value");
  });

  it("counts two callers sharing one signal as two", async () => {
    const deduper = createDeduper();
    const { task, signals } = controlledTask();
    const shared = new AbortController();
    const other = new AbortController();

    const promises = [
      deduper.run("k", task, { signal: shared.signal }),
      deduper.run("k", task, { signal: shared.signal }),
      deduper.run("k", task, { signal: other.signal }),
    ];
    promises.forEach((p) => p.catch(() => {}));

    shared.abort();
    expect(signals[0].aborted).toBe(false);
    other.abort();
    expect(signals[0].aborted).toBe(true);
  });
});

describe("cleanup", () => {
  it("leaves no listener on caller signals after the work settles", async () => {
    const deduper = createDeduper();
    const { task, resolve } = controlledTask();
    const a = trackedController();
    const b = trackedController();

    const pa = deduper.run("k", task, { signal: a.signal });
    const pb = deduper.run("k", task, { signal: b.signal });
    expect(a.listenerCount()).toBe(1);
    expect(b.listenerCount()).toBe(1);

    resolve("value");
    await Promise.all([pa, pb]);
    await flush();

    expect(a.listenerCount()).toBe(0);
    expect(b.listenerCount()).toBe(0);
  });

  it("leaves no listener on caller signals after the task fails", async () => {
    const deduper = createDeduper();
    const { task, reject } = controlledTask();
    const a = trackedController();

    const pa = deduper.run("k", task, { signal: a.signal });
    reject(new Error("boom"));
    await pa.catch(() => {});
    await flush();

    expect(a.listenerCount()).toBe(0);
  });

  it("leaves no listener on a caller's signal once that caller has aborted", async () => {
    const deduper = createDeduper();
    // The task ignores its signal and never settles.
    const { task } = controlledTask();
    const a = trackedController();
    const b = trackedController();

    const pa = deduper.run("k", task, { signal: a.signal });
    const pb = deduper.run("k", task, { signal: b.signal });
    pa.catch(() => {});
    pb.catch(() => {});

    a.controller.abort();
    expect(a.listenerCount()).toBe(0);

    b.controller.abort();
    expect(b.listenerCount()).toBe(0);
    expect(deduper.size).toBe(0);
  });

  it("ignores an abort that arrives after the caller's run settled", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();
    const a = new AbortController();

    const pa = deduper.run("k", first.task, { signal: a.signal });
    first.resolve("old");
    expect(await pa).toBe("old");
    await flush();

    const pb = deduper.run("k", second.task);
    a.abort();

    expect(second.signals[0].aborted).toBe(false);
    expect(deduper.size).toBe(1);
    second.resolve("new");
    expect(await pb).toBe("new");
  });
});

describe("edge cases", () => {
  it("rejects an already-aborted caller immediately and never invokes the task", async () => {
    const deduper = createDeduper();
    const { task } = controlledTask();
    const reason = new Error("too late");

    const pa = deduper.run("k", task, { signal: AbortSignal.abort(reason) });

    await expect(pa).rejects.toBe(reason);
    expect(task).not.toHaveBeenCalled();
    expect(deduper.size).toBe(0);
  });

  it("rejects an already-aborted caller with an AbortError when it has no custom reason", async () => {
    const deduper = createDeduper();
    const { task } = controlledTask();

    const error = await deduper
      .run("k", task, { signal: AbortSignal.abort() })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("does not let an already-aborted caller keep the work alive", async () => {
    const deduper = createDeduper();
    const { task, signals } = controlledTask();
    const live = new AbortController();
    const dead = trackedController();
    dead.controller.abort();

    const pLive = deduper.run("k", task, { signal: live.signal });
    const pDead = deduper.run("k", task, { signal: dead.signal });
    pLive.catch(() => {});
    pDead.catch(() => {});

    expect(await stateOf(pDead)).toBe("rejected");
    expect(dead.listenerCount()).toBe(0);
    expect(signals[0].aborted).toBe(false);

    live.abort();
    expect(signals[0].aborted).toBe(true);
    expect(deduper.size).toBe(0);
  });

  it("treats an options object without a signal like no options", async () => {
    const deduper = createDeduper();
    const { task, resolve } = controlledTask();

    const pa = deduper.run("k", task, {});
    resolve("value");

    expect(await pa).toBe("value");
    await flush();
    expect(deduper.size).toBe(0);
  });

  it("starts a new task after a full abort, even though the old task has not settled", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();
    const a = new AbortController();

    deduper.run("k", first.task, { signal: a.signal }).catch(() => {});
    a.abort();
    expect(first.signals[0].aborted).toBe(true);

    const pb = deduper.run("k", second.task);
    expect(second.task).toHaveBeenCalledTimes(1);
    expect(second.signals[0].aborted).toBe(false);
    expect(deduper.size).toBe(1);

    second.resolve("new");
    expect(await pb).toBe("new");
  });

  it("starts a new task for a run requested from the old task's abort listener", async () => {
    const deduper = createDeduper();
    const second = controlledTask();
    const a = new AbortController();
    let restarted: Promise<string> | undefined;

    const first = vi.fn((signal: AbortSignal) => {
      signal.addEventListener("abort", () => {
        restarted = deduper.run("k", second.task);
      });
      return new Promise<string>(() => {});
    });

    deduper.run("k", first, { signal: a.signal }).catch(() => {});
    a.abort();

    expect(second.task).toHaveBeenCalledTimes(1);
    expect(deduper.size).toBe(1);
    second.resolve("new");
    expect(await restarted).toBe("new");
  });

  it("stretch: a task that ignores its signal and resolves late cannot delete the new run's entry", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();
    const third = controlledTask();
    const a = new AbortController();

    deduper.run("k", first.task, { signal: a.signal }).catch(() => {});
    a.abort();

    const pb = deduper.run("k", second.task);
    first.resolve("stale");
    await flush();

    expect(deduper.size).toBe(1);
    expect(await stateOf(pb)).toBe("pending");

    const pc = deduper.run("k", third.task);
    expect(third.task).not.toHaveBeenCalled();

    second.resolve("new");
    expect(await pb).toBe("new");
    expect(await pc).toBe("new");
    await flush();
    expect(deduper.size).toBe(0);
  });

  it("stretch: a cancelled task that rejects late does not disturb the new run or leak a rejection", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();
    const a = new AbortController();

    deduper.run("k", first.task, { signal: a.signal }).catch(() => {});
    a.abort();

    const pb = deduper.run("k", second.task);
    first.reject(new DOMException("aborted", "AbortError"));
    await flush();

    expect(deduper.size).toBe(1);
    second.resolve("new");
    expect(await pb).toBe("new");
  });

  it("an abort from a cancelled run's successor cannot cancel a third run", async () => {
    const deduper = createDeduper();
    const first = controlledTask();
    const second = controlledTask();
    const third = controlledTask();
    const a = new AbortController();
    const c = new AbortController();

    deduper.run("k", first.task, { signal: a.signal }).catch(() => {});
    a.abort();

    deduper.run("k", second.task, { signal: c.signal }).catch(() => {});
    // A well-behaved task rejects once its signal aborts.
    first.reject(first.signals[0].reason);
    await flush();

    const pd = deduper.run("k", third.task);
    expect(third.task).not.toHaveBeenCalled();

    c.abort();
    expect(second.signals[0].aborted).toBe(false);
    expect(await stateOf(pd)).toBe("pending");

    second.resolve("new");
    expect(await pd).toBe("new");
  });

  it("a run requested by code reacting to the settled work starts fresh", async () => {
    const deduper = createDeduper();
    const first = deferred<string>();
    const second = controlledTask();
    let sizeAtSettle = -1;
    let late: Promise<string> | undefined;

    const pa = deduper.run("k", () => first.promise);
    first.promise.then(() => {
      sizeAtSettle = deduper.size;
      late = deduper.run("k", second.task);
    });
    first.resolve("old");
    await pa;

    expect(sizeAtSettle).toBe(0);
    expect(second.task).toHaveBeenCalledTimes(1);
    second.resolve("new");
    expect(await late).toBe("new");
  });

  it("cancels the work when the only caller's signal aborts while the task is starting", async () => {
    const deduper = createDeduper();
    const a = trackedController();
    let taskSignal: AbortSignal | undefined;

    const pa = deduper.run(
      "k",
      (signal) => {
        taskSignal = signal;
        a.controller.abort();
        return new Promise<string>(() => {});
      },
      { signal: a.signal },
    );
    pa.catch(() => {});

    expect(await stateOf(pa)).toBe("rejected");
    expect(taskSignal?.aborted).toBe(true);
    expect(deduper.size).toBe(0);
    expect(a.listenerCount()).toBe(0);
  });

  it("rejects the caller and holds nothing when the task throws synchronously", async () => {
    const deduper = createDeduper();
    const a = trackedController();
    const error = new Error("sync");

    const pa = deduper.run(
      "k",
      () => {
        throw error;
      },
      { signal: a.signal },
    );

    await expect(pa).rejects.toBe(error);
    await flush();
    expect(deduper.size).toBe(0);
    expect(a.listenerCount()).toBe(0);
  });
});
