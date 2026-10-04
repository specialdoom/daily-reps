/** Challenge input types */
export type TimerId = number;

export interface FakeClock {
  now(): number; // virtual ms, starts at `start`
  setTimeout(fn: () => void, delay: number): TimerId;
  setInterval(fn: () => void, delay: number): TimerId;
  clear(id: TimerId): void; // works for both timeouts and intervals
  advance(ms: number): void; // run everything due in (now, now + ms]
}

/** Challenge solution */
type Task = { fn: () => void; time: number; interval?: boolean; delay: number };

export function createFakeClock(start = 0): FakeClock {
  let current = start;
  let timerId = 0;
  let tasks = new Map<number, Task>();

  function now() {
    return current;
  }

  function setTimeout(fn: () => void, delay: number) {
    timerId++;
    tasks.set(timerId, { fn, time: current + normalizeDelay(delay), delay });

    return timerId;
  }

  function setInterval(fn: () => void, delay: number, id?: number) {
    timerId++;
    let nextId = id === undefined ? timerId : id;

    delay = normalizeDelay(delay);

    tasks.set(nextId, {
      fn,
      time: current + (delay === 0 ? 1 : delay),
      delay,
      interval: true,
    });

    return nextId;
  }

  function runCurrentTask() {
    tasks.forEach((task, key) => {
      if (task.time === current) {
        task.fn();
        if (task.interval) {
          if (tasks.has(key)) {
            setInterval(task.fn, task.delay, key);
          }
        } else {
          clear(key);
        }
      }
    });
  }

  function minimum() {
    let minimum = Infinity;
    tasks.forEach((task) => {
      if (task.time < minimum) {
        minimum = task.time;
      }
    });

    return minimum;
  }

  function advance(ms: number) {
    if (ms < 0) throw RangeError("advance could not be in the past");
    let end = current + ms;

    while (current < end) {
      runCurrentTask();
      current = minimum();
    }

    current = end;

    runCurrentTask();
  }

  function normalizeDelay(delay: number) {
    const normalizedDelay = Number.isFinite(delay) ? Math.max(0, delay) : 0;

    return normalizedDelay;
  }

  function clear(id: TimerId) {
    tasks.delete(id);
  }

  return {
    now,
    advance,
    setTimeout,
    setInterval,
    clear,
  };
}
