type TaskQueueOptions = {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

type TaskOptions = {
  priority: number;
};

type TaskFn<T> = () => Promise<T>;

type Task<T> = {
  priority: number;
  run: TaskFn<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
};

type TaskQueueStats = {
  pending: number;
  active: number;
  completed: number;
  failed: number;
};

const defaultOptions = {
  concurrency: 3,
  maxRetries: 0,
  retryDelayMs: 200,
};

class QueueClearedError extends Error {}

export function createAsyncQueue(options: TaskQueueOptions = defaultOptions) {
  const { concurrency, maxRetries, retryDelayMs } = {
    ...defaultOptions,
    ...options,
  };
  let activeCount = 0;
  const waiting = new Map<number, Task<any>[]>();
  let paused: boolean = false;
  let completed: number = 0;
  let failed: number = 0;

  function enqueue<T>(taskFn: TaskFn<T>, options?: TaskOptions) {
    const { priority }: TaskOptions = { priority: 0, ...options };
    return new Promise<T>((resolve, reject) => {
      const task: Task<T> = {
        priority,
        run: taskFn,
        resolve,
        reject,
      };

      addWaitingTask(task);

      queueMicrotask(run);
    });
  }

  function run() {
    while (!paused && waiting.size > 0 && activeCount < concurrency) {
      const nextTask = dequeueNextTask();
      if (nextTask) runTask(nextTask);
    }
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runTask<T>(task: Task<T>) {
    activeCount++;
    for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
      if (attempt > 0) {
        activeCount--;
        run();
        await sleep(retryDelayMs * Math.pow(2, attempt - 1));
        activeCount++;
      }

      try {
        const result = await task.run();
        task.resolve(result);
        completed++;
        activeCount--;
        run();
        break;
      } catch (e) {
        if (attempt === maxRetries) {
          failed++;
          activeCount--;
          run();
          task.reject(e);
        }
      }
    }
  }

  function addWaitingTask<T>(task: Task<T>) {
    const priority = task.priority;
    const tasks = waiting.get(priority) ?? [];
    waiting.set(priority, [...tasks, task]);
  }

  function dequeueNextTask() {
    if (waiting.size === 0) return undefined;

    const maxPriorityKey = Math.max(...waiting.keys());
    const tasks = waiting.get(maxPriorityKey);

    const nextTask = tasks?.shift();

    if (tasks?.length === 0) {
      waiting.delete(maxPriorityKey);
    }

    return nextTask;
  }

  function clear() {
    queueMicrotask(() =>
      waiting.forEach((tasks, key, _map) => {
        tasks.forEach((task) => {
          task.reject(new QueueClearedError());
        });
        waiting.delete(key);
      }),
    );
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
    run();
  }

  function getStats(): TaskQueueStats {
    const pendingCount = [...waiting.keys()].reduce((count, key) => {
      return count + (waiting.get(key) ?? []).length;
    }, 0);
    return {
      pending: pendingCount,
      active: activeCount,
      completed,
      failed,
    };
  }

  return {
    enqueue,
    clear,
    resume,
    pause,
    getStats,
  };
}
