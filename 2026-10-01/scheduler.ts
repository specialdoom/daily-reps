type Priority = "user-blocking" | "user-visible" | "background";

/** Challenge input. */
interface SchedulerEnv {
  now(): number; // performance.now()
  macrotask(cb: () => void): () => void; // returns a cancel fn (MessageChannel / setTimeout fallback)
  isInputPending?(): boolean; // navigator.scheduling?.isInputPending
}

interface TaskOptions {
  priority?: Priority; // default 'user-visible'
  delay?: number; // ms before the task becomes eligible
  signal?: AbortSignal;
}

interface TaskContext {
  shouldYield(): boolean; // true once the time slice is used up or input is pending
  yield(): Promise<void>; // lets higher-priority work run, then resumes
}

interface Scheduler {
  postTask<T>(fn: TaskFn<T>, opts?: TaskOptions): Promise<T>;
  readonly pending: number;
}

/** Challenge solution. */

type TaskFn<T> = (ctx: TaskContext) => T | Promise<T>;

type QueuedTask = {
  run: (ctx: TaskContext) => void;
};

export function createScheduler(env?: SchedulerEnv): Scheduler {
  let environment = env ?? {
    now: () => performance.now(),
    macrotask(cb) {
      const id = setTimeout(cb);

      return () => clearTimeout(id);
    },
    isInputPending() {
      return false;
    },
  };
  let pending = 0;
  const userBlockingQueue = new LinkedListQueue<QueuedTask>();
  const userVisibleQueue = new LinkedListQueue<QueuedTask>();
  const backgroundQueue = new LinkedListQueue<QueuedTask>();
  let cancelScheduled: (() => void) | undefined = undefined;

  function postTask<T>(fn: TaskFn<T>, opts?: TaskOptions): Promise<T> {
    if (opts?.signal?.aborted) {
      return Promise.reject(opts.signal.reason);
    }

    const promise = new Promise<T>((resolve, reject) => {
      const run = async (ctx: TaskContext) => {
        try {
          const result = await fn(ctx);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };

      let node: Node<QueuedTask> | undefined;

      if (opts?.priority === "user-blocking") {
        node = userBlockingQueue.addToBack({ run });
      } else if (opts?.priority === "background") {
        node = backgroundQueue.addToBack({ run });
      } else {
        node = userVisibleQueue.addToBack({ run });
      }

      if (opts?.signal) {
        opts.signal.addEventListener("abort", () => {
          pending--;
          if (opts?.priority === "user-blocking") {
            userBlockingQueue.removeNode(node);
          } else if (opts?.priority === "background") {
            backgroundQueue.removeNode(node);
          } else {
            userVisibleQueue.removeNode(node);
          }
          reject(opts.signal?.reason);
        });
      }
    });

    pending++;

    scheduleMacrotask();

    return promise;
  }

  function scheduleMacrotask() {
    if (!cancelScheduled) {
      const cb = () => {
        let start = environment.now();

        function sliceExpired() {
          if (environment.isInputPending) {
            return (
              environment.now() - start >= 5 || environment.isInputPending()
            );
          }

          return environment.now() - start >= 5;
        }

        cancelScheduled = undefined;
        while (!sliceExpired()) {
          const task = getNextTask();
          if (!task) break;

          pending--;

          task?.run({
            shouldYield() {
              return sliceExpired();
            },
            yield() {
              return Promise.resolve();
            },
          });
        }

        if (stillQueuing()) {
          scheduleMacrotask();
        }
      };

      cancelScheduled = environment.macrotask(cb);
    }
  }

  function getNextTask() {
    return (
      userBlockingQueue.removeFromFront() ??
      userVisibleQueue.removeFromFront() ??
      backgroundQueue.removeFromFront()
    );
  }

  function stillQueuing() {
    return (
      userBlockingQueue.head !== null ||
      userVisibleQueue.head !== null ||
      backgroundQueue.head !== null
    );
  }

  return {
    postTask,
    get pending() {
      return pending;
    },
  };
}

class Node<T> {
  value: T;
  next: Node<T> | null;
  prev: Node<T> | null;

  constructor(value: T) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

export class LinkedListQueue<T> {
  head: Node<T> | null;
  tail: Node<T> | null;

  constructor() {
    this.head = null;
    this.tail = null;
  }

  addToBack(value: T) {
    let newNode = new Node<T>(value);

    if (!this.head || !this.tail) {
      this.head = newNode;
      this.tail = newNode;
      return newNode;
    }

    newNode.prev = this.tail;
    this.tail.next = newNode;
    this.tail = newNode;

    return newNode;
  }

  addToFront(value: T) {
    let newNode = new Node<T>(value);

    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
      return newNode;
    }

    newNode.next = this.head;
    this.head.prev = newNode;
    this.head = newNode;

    return newNode;
  }

  removeFromFront(): T | undefined {
    if (!this.head) {
      return undefined;
    }

    if (this.head.next === null) {
      const value = this.head.value;
      this.head = null;
      this.tail = null;
      return value;
    }

    const value = this.head.value;
    this.head = this.head.next;
    this.head.prev = null;

    return value;
  }

  removeNode(node: Node<T>) {
    if (node.prev && node.next) {
      node.prev.next = node.next;
      node.next.prev = node.prev;
      node.next = null;
      node.prev = null;
    } else if (node.next && !node.prev) {
      this.head = node.next;
      this.head.prev = null;
      node.next = null;
    } else if (node.prev && !node.next) {
      this.tail = node.prev;
      this.tail.next = null;
      node.prev = null;
    } else {
      this.head = null;
      this.tail = null;
    }
  }
}
