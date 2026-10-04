import { describe, expect, it } from "vitest";
import { createFakeClock } from "./virtual-clock.js";

describe("createFakeClock", () => {
  describe("now()", () => {
    it("starts at 0 by default", () => {
      expect(createFakeClock().now()).toBe(0);
    });

    it("starts at the given start time", () => {
      expect(createFakeClock(1_000).now()).toBe(1_000);
    });

    it("equals start + total advanced after advance returns", () => {
      const clock = createFakeClock(100);
      clock.advance(50);
      clock.advance(25);
      expect(clock.now()).toBe(175);
    });

    it("returns the timer's due time while its callback runs", () => {
      const clock = createFakeClock();
      const seen: number[] = [];
      clock.setTimeout(() => seen.push(clock.now()), 30);

      clock.advance(100);

      expect(seen).toEqual([30]);
      expect(clock.now()).toBe(100);
    });
  });

  describe("setTimeout", () => {
    it("does not fire before its due time", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), 100);

      clock.advance(99);
      expect(log).toEqual([]);

      clock.advance(1);
      expect(log).toEqual([100]);
    });

    it("fires a timer due exactly at the end of the window", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), 100);

      clock.advance(100);

      expect(log).toEqual([100]);
    });

    it("schedules relative to now(), not to the clock's start", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => log.push(`a@${clock.now()}`), 100);
      clock.advance(50);
      clock.setTimeout(() => log.push(`b@${clock.now()}`), 100);

      clock.advance(100);

      expect(log).toEqual(["a@100", "b@150"]);
    });

    it("fires each timeout only once", () => {
      const clock = createFakeClock();
      let calls = 0;
      clock.setTimeout(() => calls++, 10);

      clock.advance(10);
      clock.advance(100);

      expect(calls).toBe(1);
    });

    it("runs timers in due-time order regardless of creation order", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => log.push("a500"), 500);
      clock.setTimeout(() => log.push("b10"), 10);
      clock.setTimeout(() => log.push("c200"), 200);

      clock.advance(1_000);

      expect(log).toEqual(["b10", "c200", "a500"]);
    });

    it("breaks ties by creation order (FIFO)", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => log.push("x"), 30);
      clock.setTimeout(() => log.push("y"), 5);
      clock.setTimeout(() => log.push("z"), 30);

      clock.advance(30);

      expect(log).toEqual(["y", "x", "z"]);
    });

    it("leaves timers beyond the window pending for a later advance", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), 5);
      clock.setTimeout(() => log.push(clock.now()), 30);

      clock.advance(20);
      expect(log).toEqual([5]);
      expect(clock.now()).toBe(20);

      clock.advance(10);
      expect(log).toEqual([5, 30]);
    });

    it("supports fractional delays", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), 10.5);

      clock.advance(20);

      expect(log).toEqual([10.5]);
    });

    it("jumps straight to due times instead of stepping through every ms", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), 60 * 60 * 1_000);

      const startedAt = performance.now();
      clock.advance(24 * 60 * 60 * 1_000);

      expect(log).toEqual([3_600_000]);
      expect(performance.now() - startedAt).toBeLessThan(100);
    });

    it("returns ids that are unique across timeouts and intervals", () => {
      const clock = createFakeClock();
      const ids = [
        clock.setInterval(() => {}, 10),
        clock.setTimeout(() => {}, 15),
        clock.setInterval(() => {}, 100),
        clock.setTimeout(() => {}, 5),
      ];

      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("timers scheduled from inside callbacks", () => {
    it("runs a nested timer in the same advance when it falls inside the window", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => {
        log.push(`p@${clock.now()}`);
        clock.setTimeout(() => log.push(`q@${clock.now()}`), 5);
      }, 10);

      clock.advance(20);

      expect(log).toEqual(["p@10", "q@15"]);
    });

    it("runs a nested timer due exactly at the end of the window", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => {
        clock.setTimeout(() => log.push(`q@${clock.now()}`), 10);
      }, 10);

      clock.advance(20);

      expect(log).toEqual(["q@20"]);
    });

    it("defers a nested timer that falls outside the window", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => {
        clock.setTimeout(() => log.push(`q@${clock.now()}`), 50);
      }, 10);

      clock.advance(20);
      expect(log).toEqual([]);

      clock.advance(40);
      expect(log).toEqual(["q@60"]);
    });

    it("runs a zero-delay timer scheduled by a callback after the timers already due at that instant", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setTimeout(() => {
        log.push("a");
        clock.setTimeout(() => log.push("nested"), 0);
      }, 10);
      clock.setTimeout(() => log.push("b"), 10);

      clock.advance(10);

      expect(log).toEqual(["a", "b", "nested"]);
    });
  });

  describe("setInterval", () => {
    it("fires repeatedly at due + delay", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setInterval(() => log.push(clock.now()), 10);

      clock.advance(100);

      expect(log).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    });

    it("schedules relative to when it was created", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.advance(50);
      clock.setInterval(() => log.push(clock.now()), 10);

      clock.advance(30);

      expect(log).toEqual([60, 70, 80]);
    });

    it("does not drift across several advance calls", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setInterval(() => log.push(clock.now()), 30);

      clock.advance(7);
      clock.advance(40);
      clock.advance(13);
      clock.advance(30);

      expect(log).toEqual([30, 60, 90]);
    });

    it("interleaves with timeouts in due-time order", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      clock.setInterval(() => log.push(`I@${clock.now()}`), 10);
      clock.setTimeout(() => log.push(`T@${clock.now()}`), 15);

      clock.advance(30);

      expect(log).toEqual(["I@10", "T@15", "I@20", "I@30"]);
    });
  });

  describe("clear", () => {
    it("cancels a pending timeout", () => {
      const clock = createFakeClock();
      let calls = 0;
      const id = clock.setTimeout(() => calls++, 10);

      clock.clear(id);
      clock.advance(100);

      expect(calls).toBe(0);
    });

    it("stops an interval from the outside", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      const id = clock.setInterval(() => log.push(clock.now()), 10);

      clock.advance(25);
      clock.clear(id);
      clock.advance(50);

      expect(log).toEqual([10, 20]);
    });

    it("stops an interval that clears itself", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      const id = clock.setInterval(() => {
        log.push(clock.now());
        if (log.length === 2) clock.clear(id);
      }, 10);

      clock.advance(100);

      expect(log).toEqual([10, 20]);
    });

    it("prevents another timer due at the same instant from running", () => {
      const clock = createFakeClock();
      const log: string[] = [];
      let bId = 0;
      clock.setTimeout(() => {
        log.push("a");
        clock.clear(bId);
      }, 10);
      bId = clock.setTimeout(() => log.push("b"), 10);

      clock.advance(10);

      expect(log).toEqual(["a"]);
    });

    it("ignores unknown and already-fired ids", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      const id = clock.setTimeout(() => {}, 5);
      clock.setTimeout(() => log.push(clock.now()), 10);
      clock.advance(5);

      expect(() => clock.clear(id)).not.toThrow();
      expect(() => clock.clear(9_999)).not.toThrow();

      clock.advance(5);
      expect(log).toEqual([10]);
    });
  });

  describe("delay normalization", () => {
    it.each([
      ["negative", -5],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY],
    ])("treats a %s timeout delay as 0", (_label, delay) => {
      const clock = createFakeClock(100);
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), delay);

      clock.advance(10);

      expect(log).toEqual([100]);
    });

    it("fires a zero-delay timeout on advance(0)", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setTimeout(() => log.push(clock.now()), 0);

      clock.advance(0);

      expect(log).toEqual([0]);
    });

    it.each([
      ["0", 0],
      ["negative", -5],
      ["NaN", Number.NaN],
    ])("clamps a %s interval delay to 1 ms so advance terminates", (_label, delay) => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setInterval(() => log.push(clock.now()), delay);

      clock.advance(5);

      expect(log).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("advance", () => {
    it("throws a RangeError for a negative value and keeps the clock unchanged", () => {
      const clock = createFakeClock(100);

      expect(() => clock.advance(-1)).toThrow(RangeError);
      expect(clock.now()).toBe(100);
    });

    it("accepts advance(0) without moving the clock", () => {
      const clock = createFakeClock(100);

      clock.advance(0);

      expect(clock.now()).toBe(100);
    });
  });

  describe("failing callbacks", () => {
    // Not stated in the README, but expected of any timer implementation:
    // an exception must not leave the clock in a corrupted state.
    it("does not re-run a timeout whose callback threw", () => {
      const clock = createFakeClock();
      let calls = 0;
      clock.setTimeout(() => {
        calls++;
        throw new Error("boom");
      }, 10);

      expect(() => clock.advance(10)).toThrow("boom");
      clock.advance(10);

      expect(calls).toBe(1);
    });

    it("keeps an interval on schedule after its callback throws once", () => {
      const clock = createFakeClock();
      const log: number[] = [];
      clock.setInterval(() => {
        log.push(clock.now());
        if (log.length === 1) throw new Error("boom");
      }, 10);

      expect(() => clock.advance(10)).toThrow("boom");
      clock.advance(20);

      expect(log).toEqual([10, 20, 30]);
      expect(clock.now()).toBe(30);
    });
  });

  describe("performance", () => {
    // README: O(log n) insertion and removal of the next timer.
    // A linear scan per jump is O(n²) overall and blows well past this budget.
    it("drains 50,000 timers quickly", () => {
      const clock = createFakeClock();
      const n = 50_000;
      let fired = 0;
      for (let i = n; i >= 1; i--) clock.setTimeout(() => fired++, i);

      const startedAt = performance.now();
      clock.advance(n);

      expect(fired).toBe(n);
      expect(performance.now() - startedAt).toBeLessThan(1_000);
    });
  });
});
