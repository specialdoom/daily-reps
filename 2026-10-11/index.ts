export type Task<T> = (signal: AbortSignal) => Promise<T>;

export interface Deduper {
  /** Run `task` for `key`, or join the in-flight run for the same key. */
  run<T>(
    key: string,
    task: Task<T>,
    opts?: { signal?: AbortSignal },
  ): Promise<T>;
  /** Number of keys currently in flight. */
  readonly size: number;
}

type Entry = {
  promise: Promise<unknown>;
  controller: AbortController;
  count: number;
};

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ?? new DOMException("This operation was aborted", "AbortError");

export function createDeduper(): Deduper {
  const tasks: Map<string, Entry> = new Map();

  // A cancelled run can still be settling while a newer run owns the key, so an
  // entry is only ever removed by identity, never by key alone.
  function drop(key: string, entry: Entry) {
    if (tasks.get(key) === entry) tasks.delete(key);
  }

  function start(key: string, task: Task<unknown>): Entry {
    const controller = new AbortController();
    const newEntry: Entry = {
      promise: task(controller.signal),
      controller,
      count: 0,
    };

    // Registered first, so the key is gone before any caller sees the result.
    const settled = () => drop(key, newEntry);
    newEntry.promise.then(settled, settled);

    tasks.set(key, newEntry);
    return newEntry;
  }

  function run<T>(
    key: string,
    task: Task<T>,
    opts?: { signal?: AbortSignal },
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const signal = opts?.signal;

      if (signal?.aborted) {
        reject(abortReason(signal));
        return;
      }

      const entry = tasks.get(key) ?? start(key, task);
      entry.count += 1;

      if (!signal) {
        // The map can't know each key's T; callers of one key share the task's type.
        entry.promise.then((value) => resolve(value as T), reject);
        return;
      }

      const abortHandler = () => {
        signal.removeEventListener("abort", abortHandler);
        reject(abortReason(signal));

        entry.count -= 1;
        if (entry.count === 0) {
          // Drop before aborting: an abort listener inside the task may call
          // run() for this key and must get a new task, not this dead one.
          drop(key, entry);
          entry.controller.abort();
        }
      };

      // The task may have aborted this caller's signal while it was starting.
      if (signal.aborted) {
        abortHandler();
        return;
      }

      signal.addEventListener("abort", abortHandler);

      entry.promise.then(
        (value) => {
          signal.removeEventListener("abort", abortHandler);
          resolve(value as T);
        },
        (error) => {
          signal.removeEventListener("abort", abortHandler);
          reject(error);
        },
      );
    });
  }

  return {
    run,
    get size() {
      return tasks.size;
    },
  };
}
