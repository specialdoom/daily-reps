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

export function createDeduper(): Deduper {
  const tasks: Map<
    string,
    {
      promise: Promise<unknown>;
      controller: AbortController;
      count: number;
    }
  > = new Map();
  function run<T>(key: string, task: Task<T>, opts?: { signal: AbortSignal }) {
    return new Promise<T>((resolve, rejects) => {
      const abortHandler = () => {
        const existingKey = tasks.get(key);
        rejects(opts?.signal.reason ?? new DOMException("abort", "AbortError"));
        if (existingKey) {
          const newCount = existingKey.count - 1;
          if (newCount === 0) {
            existingKey.controller.abort();
            tasks.delete(key);
          } else {
            tasks.set(key, {
              ...existingKey,
              count: newCount,
            });
          }
        }
      };

      if (opts?.signal) {
        if (opts.signal.aborted) {
          rejects(new DOMException("abort", "AbortError"));
          return;
        }

        opts.signal.addEventListener("abort", abortHandler);
      }

      const controller = new AbortController();
      const existingKey = tasks.get(key);

      const newEntry = {
        promise: existingKey?.promise ?? task(controller.signal),
        controller: existingKey?.controller ?? controller,
        count: existingKey?.count ? existingKey?.count + 1 : 1,
      };

      newEntry.promise
        .then(() => {
          resolve(newEntry.promise);
        })
        .catch((error) => {
          rejects(error);
        })
        .finally(() => {
          tasks.delete(key);
          opts?.signal.removeEventListener("abort", abortHandler);
        });

      tasks.set(key, newEntry);
    });
  }

  return {
    run,
    get size() {
      return [...tasks.keys()].length;
    },
  };
}
