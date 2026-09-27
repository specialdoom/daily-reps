type TaskQueueOptions = {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

type TaskOptions = {
  priority?: number;
};

type TaskFn<T> = () => Promise<T>;

type Task<T> = {
  priority: number;
  run: TaskFn<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  attempts?: number; // track retry attempts on the task itself
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
  // Merge defaults with provided options
  const { concurrency, maxRetries, retryDelayMs } = {
    ...defaultOptions,
    ...options,
  };

  let activeCount = 0; // number of currently running tasks
  const waiting = new Map<number, Task<any>[]>(); // priority buckets -> FIFO arrays
  let paused: boolean = false;
  let completed: number = 0;
  let failed: number = 0;

  // Enqueue a new task. Returns a promise that resolves/rejects with the task result.
  function enqueue<T>(taskFn: TaskFn<T>, options?: TaskOptions) {
    const { priority }: TaskOptions = { priority: 0, ...options };
    return new Promise<T>((resolve, reject) => {
      const task: Task<T> = {
        priority,
        run: taskFn,
        resolve,
        reject,
        attempts: 0,
      };

      addWaitingTask(task);

      // Try to start tasks (runs synchronously until concurrency limit reached)
      run();
    });
  }

  // Main loop: start as many tasks as allowed by concurrency and pause state.
  function run() {
    while (!paused && size() > 0 && activeCount < concurrency) {
      const nextTask = dequeueNextTask();
      if (nextTask) runTask(nextTask);
    }
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Execute a single task. On failure we schedule a retry by re-enqueueing the task
  // after the exponential backoff delay. This ensures the concurrency counter is
  // managed only when tasks actually start/finish and cannot exceed the configured limit.
  async function runTask<T>(task: Task<T>) {
    activeCount++;

    try {
      const result = await task.run();
      task.resolve(result);
      completed++;
      // task finished successfully -> free a slot and try to run more
      activeCount--;
      run();
      return;
    } catch (e) {
      // increment attempts and decide whether to retry
      task.attempts = (task.attempts ?? 0) + 1;

      if (task.attempts > (maxRetries ?? 0)) {
        // no more retries -> mark failed, free slot and reject
        failed++;
        activeCount--;
        run();
        task.reject(e);
        return;
      }

      // schedule retry with exponential backoff. Release the concurrency slot
      // so other tasks can proceed while this one waits.
      activeCount--;
      run();

      const backoff = (retryDelayMs ?? 0) * Math.pow(2, task.attempts - 1);
      setTimeout(() => {
        // Re-enqueue the same task instance so it retains its attempts count.
        addWaitingTask(task);
        // Ensure run() happens asynchronously after the task is added.
        if (typeof queueMicrotask === "function") {
          queueMicrotask(run);
        } else {
          // fallback for environments without queueMicrotask
          Promise.resolve().then(run);
        }
      }, backoff);

      return;
    }
  }

  function addWaitingTask<T>(task: Task<T>) {
    const priority = task.priority;
    const tasks = waiting.get(priority) ?? [];
    // append to preserve FIFO within the same priority
    tasks.push(task);
    waiting.set(priority, tasks);
  }

  function dequeueNextTask() {
    if (waiting.size === 0) return undefined;

    // choose the highest priority key
    const maxPriorityKey = Math.max(...waiting.keys());
    const tasks = waiting.get(maxPriorityKey);

    const nextTask = tasks?.shift();

    if (tasks?.length === 0) {
      waiting.delete(maxPriorityKey);
    }

    return nextTask;
  }

  // Immediately reject all pending (non-running) tasks and clear the waiting map.
  function clear() {
    waiting.forEach((tasks, _key) => {
      tasks.forEach((task) => {
        task.reject(new QueueClearedError("queue cleared"));
      });
    });

    waiting.clear();
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
    run();
  }

  function getStats(): TaskQueueStats {
    const pendingCount = size();
    return {
      pending: pendingCount,
      active: activeCount,
      completed,
      failed,
    };
  }

  // convenience helpers used by tests / callers
  function size() {
    return [...waiting.values()].reduce((count, arr) => count + arr.length, 0);
  }

  function running() {
    return activeCount;
  }

  return {
    enqueue,
    clear,
    resume,
    pause,
    getStats,
    size,
    running,
  };
}
