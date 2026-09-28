import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BehaviorSubject, of, Subject } from "rxjs";
import { toDebounceSignal } from "./solution.js";

/** Minimal stand-in for Angular's DestroyRef: collects callbacks, runs them on destroy(). */
function createDestroyRef() {
  const callbacks: (() => void)[] = [];
  return {
    onDestroy: vi.fn((callback: () => void) => {
      callbacks.push(callback);
    }),
    destroy() {
      callbacks.forEach((callback) => callback());
    },
  };
}

describe("toDebounceSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("reading the value", () => {
    it("returns the initial value before the source emits", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 42,
        debounceMs: 100,
      });

      expect(price()).toBe(42);
    });

    it("returns the same getter reference on every read", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });

      const first = price;
      price();
      price();
      expect(price).toBe(first);
    });

    it("keeps separate state for separate signals", () => {
      const price$ = new Subject<number>();
      const qty$ = new Subject<number>();
      const price = toDebounceSignal(price$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const qty = toDebounceSignal(qty$, { initialValue: 1, debounceMs: 100 });

      qty$.next(5);
      vi.advanceTimersByTime(100);

      expect(price()).toBe(0);
      expect(qty()).toBe(5);
    });
  });

  describe("debouncing", () => {
    it("does not update before debounceMs has elapsed", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });

      source$.next(1);
      vi.advanceTimersByTime(99);

      expect(price()).toBe(0);
    });

    it("updates once debounceMs has elapsed", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });

      source$.next(1);
      vi.advanceTimersByTime(100);

      expect(price()).toBe(1);
    });

    it("only keeps the last value of a rapid burst", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const listener = vi.fn();
      price.subscribe(listener);

      source$.next(1);
      source$.next(2);
      source$.next(3);
      vi.advanceTimersByTime(100);

      expect(price()).toBe(3);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(3);
    });

    it("restarts the debounce window on every emission", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });

      source$.next(1);
      vi.advanceTimersByTime(80);
      source$.next(2);
      vi.advanceTimersByTime(80);

      expect(price()).toBe(0);

      vi.advanceTimersByTime(20);
      expect(price()).toBe(2);
    });
  });

  describe("notifications", () => {
    it("notifies subscribers with the new value", () => {
      const source$ = new Subject<string>();
      const name = toDebounceSignal(source$, {
        initialValue: "",
        debounceMs: 50,
      });
      const listener = vi.fn();
      name.subscribe(listener);

      source$.next("ada");
      vi.advanceTimersByTime(50);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith("ada");
    });

    it("notifies every subscriber", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const a = vi.fn();
      const b = vi.fn();
      price.subscribe(a);
      price.subscribe(b);

      source$.next(1);
      vi.advanceTimersByTime(100);

      expect(a).toHaveBeenCalledWith(1);
      expect(b).toHaveBeenCalledWith(1);
    });

    it("does not notify when the debounced value equals the current value", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const listener = vi.fn();
      price.subscribe(listener);

      source$.next(0);
      vi.advanceTimersByTime(100);
      expect(listener).not.toHaveBeenCalled();

      source$.next(1);
      vi.advanceTimersByTime(100);
      source$.next(1);
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("uses strict reference equality for objects", () => {
      const source$ = new Subject<{ id: number }>();
      const first = { id: 1 };
      const user = toDebounceSignal(source$, {
        initialValue: first,
        debounceMs: 100,
      });
      const listener = vi.fn();
      user.subscribe(listener);

      source$.next(first);
      vi.advanceTimersByTime(100);
      expect(listener).not.toHaveBeenCalled();

      const lookalike = { id: 1 };
      source$.next(lookalike);
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledWith(lookalike);
      expect(user()).toBe(lookalike);
    });

    it("stops notifying a listener after its unsubscribe function is called", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const listener = vi.fn();
      const stop = price.subscribe(listener);

      stop();
      source$.next(1);
      vi.advanceTimersByTime(100);

      expect(listener).not.toHaveBeenCalled();
      expect(price()).toBe(1);
    });

    it("keeps notifying other listeners when one unsubscribes itself mid-notification", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const other = vi.fn();
      const stop = price.subscribe(() => stop());
      price.subscribe(other);

      source$.next(1);
      vi.advanceTimersByTime(100);

      expect(other).toHaveBeenCalledWith(1);
    });
  });

  describe("cleanup", () => {
    it("manual unsubscribe releases the source", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });

      price.unsubscribe();

      expect(source$.observed).toBe(false);
    });

    it("manual unsubscribe cancels a pending debounced emission", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const listener = vi.fn();
      price.subscribe(listener);

      source$.next(1);
      vi.advanceTimersByTime(50);
      price.unsubscribe();
      vi.advanceTimersByTime(200);

      expect(price()).toBe(0);
      expect(listener).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("registers exactly one callback with destroyRef at creation", () => {
      const source$ = new Subject<number>();
      const destroyRef = createDestroyRef();

      toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
        destroyRef,
      });

      expect(destroyRef.onDestroy).toHaveBeenCalledOnce();
    });

    it("destroying the host releases the source and cancels pending emissions", () => {
      const source$ = new Subject<number>();
      const destroyRef = createDestroyRef();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
        destroyRef,
      });

      source$.next(1);
      vi.advanceTimersByTime(100);
      source$.next(2);
      destroyRef.destroy();
      vi.advanceTimersByTime(200);

      expect(price()).toBe(1);
      expect(source$.observed).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("tolerates both destroyRef and manual unsubscribe running", () => {
      const source$ = new Subject<number>();
      const destroyRef = createDestroyRef();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
        destroyRef,
      });

      expect(() => {
        price.unsubscribe();
        destroyRef.destroy();
      }).not.toThrow();
    });
  });

  describe("synchronous sources", () => {
    it("of(): exposes the value right away because completion flushes the debounce", () => {
      const price = toDebounceSignal(of(10), {
        initialValue: 0,
        debounceMs: 100,
      });

      expect(price()).toBe(10);
    });

    it("BehaviorSubject: keeps the initial value until the debounce window passes", () => {
      const source$ = new BehaviorSubject(5);
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const listener = vi.fn();
      price.subscribe(listener);

      expect(price()).toBe(0);

      vi.advanceTimersByTime(100);
      expect(price()).toBe(5);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("BehaviorSubject: does not notify when its current value equals initialValue", () => {
      const source$ = new BehaviorSubject(0);
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
      });
      const listener = vi.fn();
      price.subscribe(listener);

      vi.advanceTimersByTime(100);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("errors", () => {
    it("calls onError with the error and keeps the last valid value", () => {
      const source$ = new Subject<number>();
      const onError = vi.fn();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
        onError,
      });

      source$.next(1);
      vi.advanceTimersByTime(100);
      const error = new Error("boom");
      source$.error(error);

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(error);
      expect(price()).toBe(1);
    });

    it("does not throw an unhandled error when onError is provided", () => {
      const source$ = new Subject<number>();
      toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
        onError: vi.fn(),
      });

      source$.error(new Error("boom"));

      // RxJS reports unhandled errors by throwing from a setTimeout.
      expect(() => vi.runAllTimers()).not.toThrow();
    });

    it("does not throw an unhandled error when onError is omitted", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 7,
        debounceMs: 100,
      });

      source$.error(new Error("boom"));

      expect(() => vi.runAllTimers()).not.toThrow();
      expect(price()).toBe(7);
    });

    it("does not notify listeners on error", () => {
      const source$ = new Subject<number>();
      const price = toDebounceSignal(source$, {
        initialValue: 0,
        debounceMs: 100,
        onError: vi.fn(),
      });
      const listener = vi.fn();
      price.subscribe(listener);

      source$.error(new Error("boom"));
      vi.runAllTimers();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
