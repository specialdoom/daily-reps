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

// Review: `interval?: boolean` + `delay` became a single `interval: number | null`.
// A timeout never needs its delay after scheduling, and one field cannot get
// out of sync with the other.
type Timer = {
  id: TimerId;
  fn: () => void;
  time: number; // absolute due instant
  interval: number | null; // repeat delay (already clamped to >= 1 ms), null for timeouts
};

/**
 * Binary min-heap stored in a flat array.
 * Children of `i` live at `2i + 1` / `2i + 2`, its parent at `(i - 1) >> 1`.
 * The only invariant is "parent <= children", so the minimum is always at 0.
 */
class MinHeap<T> {
  private items: T[] = [];

  constructor(private readonly less: (a: T, b: T) => boolean) {}

  get size() {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  // O(log n): append, then sift up until the parent is not larger.
  push(item: T) {
    const items = this.items;
    items.push(item);

    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(items[i], items[parent])) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  // O(log n): move the last item to the root, then sift down towards the
  // smaller child until both children are not smaller.
  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length === 0 || last === undefined) return top;

    items[0] = last;
    let i = 0;
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;

      if (left < items.length && this.less(items[left], items[smallest])) smallest = left;
      if (right < items.length && this.less(items[right], items[smallest])) smallest = right;
      if (smallest === i) break;

      [items[i], items[smallest]] = [items[smallest], items[i]];
      i = smallest;
    }

    return top;
  }
}

// Review: the old version broke ties by `Map` insertion order, which only
// worked because forEach happens to visit keys in insertion order. A heap is
// not stable, so the tie-break has to be explicit: equal due times run in
// creation order, and ids are handed out in creation order.
const runsBefore = (a: Timer, b: Timer) => a.time < b.time || (a.time === b.time && a.id < b.id);

// Review: kept from the original (normalizeDelay), moved out of the closure
// because it does not depend on clock state.
function normalizeDelay(delay: number) {
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

export function createFakeClock(start = 0): FakeClock {
  let current = start;
  let lastId = 0;

  // Review: two structures with separate jobs instead of one Map that was
  // scanned on every step:
  //   - `queue` answers "what runs next?" in O(log n)
  //   - `active` answers "is this timer still alive?" in O(1)
  // `clear` only removes from `active`; the stale heap entry is skipped when it
  // reaches the top ("lazy deletion"). Removing an arbitrary element from a
  // heap would first need an O(n) search for its index.
  const queue = new MinHeap<Timer>(runsBefore);
  const active = new Map<TimerId, Timer>();

  function now() {
    return current;
  }

  function schedule(fn: () => void, delay: number, interval: number | null) {
    const timer: Timer = { id: ++lastId, fn, time: current + delay, interval };
    active.set(timer.id, timer);
    queue.push(timer);

    return timer.id;
  }

  function setTimeout(fn: () => void, delay: number) {
    return schedule(fn, normalizeDelay(delay), null);
  }

  // Review: the public setInterval no longer takes a third `id` parameter.
  // Rescheduling is internal, and exposing it let callers overwrite any live
  // timer by passing its id. It also burned a fresh id on every reschedule.
  function setInterval(fn: () => void, delay: number) {
    // Clamp to >= 1 ms: a 0 ms interval would reschedule at the same instant
    // forever and advance would never return.
    const interval = Math.max(1, normalizeDelay(delay));

    return schedule(fn, interval, interval);
  }

  function clear(id: TimerId) {
    active.delete(id);
  }

  // Drops cleared timers sitting on top of the heap and returns the next live one.
  function peekLive() {
    let next = queue.peek();
    while (next && active.get(next.id) !== next) {
      queue.pop();
      next = queue.peek();
    }

    return next;
  }

  // Review: replaces the runCurrentTask() + minimum() pair. Each iteration
  // pops exactly the next due timer in O(log n), instead of scanning every
  // timer twice per distinct due time (O(n²) for n timers: 50k timers took
  // ~14 s before, ~30 ms now).
  function advance(ms: number) {
    // Review: also rejects NaN. `NaN < 0` is false, so the old check let it
    // through and every later now() returned NaN.
    if (!(ms >= 0)) throw new RangeError(`advance(ms) needs a non-negative number, got ${ms}`);

    const end = current + ms;

    for (let next = peekLive(); next && next.time <= end; next = peekLive()) {
      queue.pop();
      current = next.time;

      // Review: update bookkeeping *before* calling fn. Previously a throwing
      // callback skipped clear()/reschedule, so a timeout re-ran on the next
      // advance and an interval stayed at its old due time.
      // An interval goes back into the heap under the same id and keeps its
      // slot in `active`, so a clear(id) from inside fn still cancels it.
      if (next.interval === null) {
        active.delete(next.id);
      } else {
        next.time += next.interval; // due + delay, never now + delay: no drift
        queue.push(next);
      }

      next.fn();
    }

    current = end;
  }

  return {
    now,
    setTimeout,
    setInterval,
    clear,
    advance,
  };
}
