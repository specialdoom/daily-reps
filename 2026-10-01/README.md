### **Daily Frontend Challenge: [Core Web Standards & Performance] Cooperative Scheduler with `scheduler.postTask` Semantics**

#### **Overview**

Long tasks are the main cause of poor INP: a 300 ms hydration or list-diffing job blocks the main thread, and the next click waits behind it. Modern browsers expose `scheduler.postTask()`, `scheduler.yield()` and `isInputPending()` to fix this, but support is uneven and production code needs a fallback. You're building a small, testable, DOM-agnostic cooperative scheduler that gives priority-aware task execution, cancellation, and time-sliced yielding, so that large jobs stay responsive.

---

### **Detailed Requirements**

- Implement `createScheduler(env?: SchedulerEnv): Scheduler`, where the environment is injectable so Vitest can drive it with fake clocks:

  ```ts
  type Priority = 'user-blocking' | 'user-visible' | 'background';

  interface SchedulerEnv {
    now(): number;                                  // performance.now()
    macrotask(cb: () => void): () => void;          // returns a cancel fn (MessageChannel / setTimeout fallback)
    isInputPending?(): boolean;                     // navigator.scheduling?.isInputPending
  }

  interface TaskOptions {
    priority?: Priority;                            // default 'user-visible'
    delay?: number;                                 // ms before the task becomes eligible
    signal?: AbortSignal;
  }

  interface TaskContext {
    shouldYield(): boolean;                         // true once the time slice is used up or input is pending
    yield(): Promise<void>;                         // lets higher-priority work run, then resumes
  }

  interface Scheduler {
    postTask<T>(fn: (ctx: TaskContext) => T | Promise<T>, opts?: TaskOptions): Promise<T>;
    readonly pending: number;
  }
  ```

- Tasks run in priority order (`user-blocking` > `user-visible` > `background`), FIFO within the same priority. A delayed task only competes once its delay has elapsed.
- The scheduler runs tasks in **time slices of at most 5 ms** per macrotask, then hands control back to the event loop. A slice may be cut short when `isInputPending()` returns true.
- `ctx.yield()` re-enqueues the continuation at the *same* priority, but at the front of that priority's queue, so a long task is not starved by its peers. A newly posted higher-priority task must run before the continuation.
- Aborting via `signal` rejects the promise with `signal.reason` (a `DOMException` named `AbortError` by default). A task aborted before it starts never runs. A task aborted mid-run sees `ctx.shouldYield()` return `true` so it can bail out.
- Errors thrown by a task reject only that task's promise and never stop the scheduler loop.
- **Constraints:** strict TypeScript, no `any`, no dependency on globals other than through `SchedulerEnv`, and no more than one macrotask scheduled at a time.

---

### **Edge Cases & Performance Considerations**

- **Starvation:** continuous `user-blocking` work must not block `background` tasks forever. Add an aging rule (for example, promote a task after 1 s of waiting) and document it.
- **Re-entrancy:** calling `postTask` from inside a running task, or aborting from inside a task, must not corrupt the queues. Avoid O(n) array shifts on the hot path (use a heap or per-priority linked queues).
- **Memory & listeners:** remove `abort` listeners and drop references to settled tasks. A scheduler that has 10k aborted tasks must not retain them.
- **Idle behaviour:** when no tasks are pending, no macrotask should remain scheduled (the cancel function must be called), so that the page can go idle and tests can detect leaks.
- **Stretch goal:** add `scheduler.wrap(fn, opts)` that returns a function whose invocations are coalesced (latest-wins) into one scheduled task per tick, and show how it behaves as an input-handler wrapper.

---

### **Interactive Next Steps**

- **(A)** Ask for a comprehensive Vitest suite or starter code.
- **(B)** Paste your solution for a review of type accuracy, edge cases and performance.
