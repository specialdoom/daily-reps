# Frontend Daily Challenge — 2026-09-26

## 1. Async Task Queue with Concurrency & Retry Control

#### **Overview**

In frontend engineering, handling bursts of asynchronous requests—such as batch uploading files, fetching paginated dashboard data, or processing background image conversions—requires strictly controlled concurrency to avoid overloading network bandwidth or server resources.

Your task is to implement a strongly-typed **Async Queue manager** in TypeScript/JavaScript that processes a stream of async tasks with strict concurrency limits, priority queueing, and exponential backoff retry mechanisms.

---

### **Detailed Requirements**

#### **1. Queue Initialization**

- The `TaskQueue` class or factory should accept an optional options object:
- `concurrency`: Maximum number of tasks executing simultaneously (default: `3`).
- `maxRetries`: Maximum times a failed task can be retried (default: `0`).
- `retryDelayMs`: Initial delay in milliseconds before retrying a failed task (default: `200`).

#### **2. Core API**

- **`enqueue(taskFn, options?): Promise`**
- Accepts an asynchronous task function `() => Promise`.
- Accepts optional per-task configuration:
- `priority` _(number)_: Higher priority tasks are executed before lower priority tasks when worker slots free up (default: `0`).

- Returns a **Promise** that resolves with the task's return value or rejects if all retries are exhausted.

- **`clear(): void`**
- Empties all pending (non-running) tasks from the queue and rejects their returned promises with a `QueueClearedError`.

- **`pause() / resume(): void`**
- `pause()` prevents _new_ pending tasks from starting, while allowing currently executing tasks to complete.
- `resume()` unblocks processing of remaining pending tasks.

- **`getStats(): QueueStats`**
- Returns snapshot metrics: `{ pending: number, active: number, completed: number, failed: number }`.

---

### **Execution & Edge-Case Behavior**

1. **Priority Scheduling:**

- If multiple tasks are waiting in the queue when an execution slot becomes available, the task with the highest priority number **must** execute first.
- Tasks with equal priority follow First-In, First-Out (FIFO) ordering.

2. **Retry Mechanism & Exponential Backoff:**

- If a task throws an error, retry it up to `maxRetries` times.
- On retry $n$ (1-indexed), wait `retryDelayMs * Math.pow(2, n - 1)` milliseconds before re-executing.
- During the retry backoff delay, the task relinquishes its concurrency slot so other pending tasks can proceed.

3. **Concurrency Integrity:**

- At no point should the number of concurrently executing task promises exceed `concurrency`.

---

### **Test Scenarios to Cover**

- **Concurrency Limit:** Enqueueing 10 tasks (each taking 100ms) with `concurrency: 2` finishes in approximately 500ms, running at most 2 in parallel at any point.
- **Priority Jump:** Enqueue 3 low-priority tasks when queue is full, then 1 high-priority task. The high-priority task runs before the low-priority ones once a slot opens.
- **Backoff Timing:** A failing task with `maxRetries: 2` and `retryDelayMs: 100` pauses ~100ms before retry 1 and ~200ms before retry 2.
- **Graceful Clearing:** Calling `.clear()` immediately rejects all non-active task promises with `QueueClearedError` without interfering with currently active tasks.

---

## 2. Type-Safe Debounced Search Input

**Focus Area:** Frontend UX, TypeScript, event handling, performance  
**Difficulty:** Intermediate

### Overview

Build a reusable, type-safe debounced search input in TypeScript. The goal is to delay expensive search work until the user pauses typing, while keeping the API ergonomic and easy to reuse in real UI code.

### Requirements

- Accept a query string and a debounce delay in milliseconds.
- Return the current debounced value after the delay.
- Only trigger the latest search after the user stops typing for the configured duration.
- If the input changes before the delay ends, cancel the previous pending update.
- Keep the implementation strongly typed and reusable.
- Avoid unnecessary duplicate work.

### Core API

Implement either:

- a hook, such as `useDebouncedValue(value, delay)`, or
- a utility function, such as `debounceValue(value, delay)`

Suggested behavior:

- The debounced value should update only after the delay has passed without another change.
- A stale previous value should not overwrite the most recent input.
- If the passed value is unchanged, avoid unnecessary re-triggering.

### Edge Cases

- Empty string should be handled as a valid query and should still debounce properly.
- Very rapid updates should only resolve to the latest value.
- A delay of 0 should still work correctly.
- If the debounce is canceled due to a new value, the older search should not run.
- The implementation should not rely on browser globals when testable in Node.

### Common Test Cases

- Returns the original value immediately when delay is 0.
- Delays updates until the timer expires.
- Repeated updates before the timer completes should keep only the latest value.
- Empty strings should be debounced like any other value.
- A stale previous timer should not trigger after a newer value arrives.
- Repeated identical values should not unnecessarily re-trigger downstream logic.

### Bonus

- Add a helper that returns both the debounced value and an `isPending` state.
- Write a version that works with async fetch/search logic and cancels stale requests.

### Goal

Create a small, testable, reusable debounce utility that feels natural in a real frontend app and is easy to unit test.
