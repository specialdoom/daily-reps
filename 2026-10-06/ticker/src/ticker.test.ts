import { createComputed, createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTicker, type TickerOptions } from "./ticker";

class FakeSource extends EventTarget {
  static all: FakeSource[] = [];
  closed = false;
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    FakeSource.all.push(this);
  }

  close() {
    this.closed = true;
  }

  open() {
    this.dispatchEvent(new Event("open"));
  }

  emit(id: number | string, data: unknown) {
    this.dispatchEvent(
      new MessageEvent("message", {
        lastEventId: String(id),
        data: typeof data === "string" ? data : JSON.stringify(data),
      }),
    );
  }

  fail() {
    this.dispatchEvent(new Event("error"));
  }
}

const latest = () => FakeSource.all[FakeSource.all.length - 1];
const tick = (price = 100) => ({ symbol: "ACME", price });

function setup(overrides: Partial<TickerOptions> = {}) {
  const timers = new Map<number, { fn: () => void; ms: number }>();
  const frames: (() => void)[] = [];
  let nextTimer = 1;
  // Also catch the global, for implementations that don't take scheduleFlush.
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => frames.push(fn));

  const options: TickerOptions = {
    url: "http://localhost:3001/stream",
    createSource: (url) => new FakeSource(url) as unknown as EventSource,
    setTimer: (fn, ms) => {
      timers.set(nextTimer, { fn, ms });
      return nextTimer++;
    },
    clearTimer: (id) => timers.delete(id),
    scheduleFlush: (fn) => frames.push(fn),
    ...overrides,
  };

  let dispose!: () => void;
  let writes = 0;
  const ticker = createRoot((d) => {
    dispose = d;
    const t = createTicker(options);
    createComputed(() => {
      t.ticks();
      writes++;
    });
    return t;
  });

  return {
    ticker,
    dispose,
    timers,
    writes: () => writes - 1,
    flushFrames() {
      frames.splice(0).forEach((fn) => fn());
    },
    fireTimers() {
      const due = [...timers.values()];
      timers.clear();
      due.forEach(({ fn }) => fn());
    },
    ids: () => ticker.ticks().map((t) => t.id),
  };
}

afterEach(() => {
  FakeSource.all = [];
  vi.unstubAllGlobals();
});

describe("ticks", () => {
  it("parses events into ticks, newest first", () => {
    const t = setup();
    latest().open();
    latest().emit(1, tick(101));
    latest().emit(2, tick(102));
    t.flushFrames();

    expect(t.ticker.ticks()).toEqual([
      { id: 2, symbol: "ACME", price: 102 },
      { id: 1, symbol: "ACME", price: 101 },
    ]);
  });

  it("keeps at most `limit` ticks", () => {
    const t = setup({ limit: 3 });
    for (let id = 1; id <= 10; id++) latest().emit(id, tick());
    t.flushFrames();
    latest().emit(11, tick());
    t.flushFrames();

    expect(t.ids()).toEqual([11, 10, 9]);
  });

  it("drops duplicates and stale ids", () => {
    const t = setup();
    for (const id of [1, 2, 3, 2, 3, 1, 4]) latest().emit(id, tick());
    t.flushFrames();

    expect(t.ids()).toEqual([4, 3, 2, 1]);
  });

  it("compares ids as numbers, not strings", () => {
    const t = setup();
    latest().emit(9, tick());
    latest().emit(10, tick());
    t.flushFrames();

    expect(t.ids()).toEqual([10, 9]);
  });

  it("ignores events with a non-numeric id without breaking dedup", () => {
    const t = setup();
    latest().emit(1, tick());
    latest().emit("abc", tick());
    latest().emit("", tick());
    latest().emit(1, tick());
    latest().emit(2, tick());
    t.flushFrames();

    expect(t.ids()).toEqual([2, 1]);
  });

  it("skips an invalid payload without marking its id as seen", () => {
    const t = setup();
    latest().emit(1, tick());
    latest().emit(2, "{not json");
    latest().emit(2, tick(102));
    t.flushFrames();

    expect(t.ticker.ticks()[0]).toEqual({ id: 2, symbol: "ACME", price: 102 });
  });

  it("keeps the event id even if the payload has an `id` field", () => {
    const t = setup();
    latest().emit(5, { ...tick(), id: 999 });
    t.flushFrames();

    expect(t.ids()).toEqual([5]);
  });

  it("writes a burst of events to the signal once", () => {
    const t = setup();
    for (let id = 1; id <= 50; id++) latest().emit(id, tick());
    t.flushFrames();

    expect(t.writes()).toBe(1);
    expect(t.ids()).toHaveLength(20);
    expect(t.ids()[0]).toBe(50);
  });
});

describe("reconnecting", () => {
  it("starts connecting and becomes open on `open`", () => {
    const t = setup();
    expect(t.ticker.status()).toBe("connecting");

    latest().open();
    expect(t.ticker.status()).toBe("open");
  });

  it("closes the source itself and schedules one reconnect on error", () => {
    const t = setup();
    const first = latest();
    first.open();
    first.fail();
    first.fail();

    expect(first.closed).toBe(true);
    expect(t.ticker.status()).toBe("reconnecting");
    expect([...t.timers.values()].map((x) => x.ms)).toEqual([500]);
    expect(FakeSource.all).toHaveLength(1);
  });

  it("resumes from the last seen id", () => {
    const t = setup();
    latest().emit(41, tick());
    latest().emit(42, tick());
    latest().fail();
    t.fireTimers();

    expect(new URL(latest().url).searchParams.get("lastEventId")).toBe("42");
  });

  it("keeps an existing query string when resuming", () => {
    const t = setup({ url: "http://localhost:3001/stream?symbol=ACME" });
    latest().emit(7, tick());
    latest().fail();
    t.fireTimers();

    const params = new URL(latest().url).searchParams;
    expect(params.get("symbol")).toBe("ACME");
    expect(params.get("lastEventId")).toBe("7");
  });

  it("backs off exponentially up to maxDelayMs, and resets after open", () => {
    const t = setup({ baseDelayMs: 500, maxDelayMs: 4000 });
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      latest().fail();
      delays.push(...[...t.timers.values()].map((x) => x.ms));
      t.fireTimers();
    }
    expect(delays).toEqual([500, 1000, 2000, 4000, 4000]);

    latest().open();
    latest().fail();
    expect([...t.timers.values()].map((x) => x.ms)).toEqual([500]);
  });

  it("keeps reconnecting while the server stays down", () => {
    const t = setup();
    latest().fail();
    t.fireTimers();
    latest().fail();

    expect(t.timers.size).toBe(1);
    expect(t.ticker.status()).toBe("reconnecting");
  });

  it("is gap-free and duplicate-free across a drop with an overlapping replay", () => {
    const t = setup();
    for (let id = 1; id <= 5; id++) latest().emit(id, tick());
    latest().fail();
    t.fireTimers();
    latest().open();
    for (let id = 3; id <= 8; id++) latest().emit(id, tick());
    t.flushFrames();

    expect(t.ids()).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
    expect(t.ticker.status()).toBe("open");
  });

  it("ignores events from a source it has replaced", () => {
    const t = setup();
    const old = latest();
    old.fail();
    t.fireTimers();
    latest().open();
    old.emit(1, tick());
    old.fail();
    t.flushFrames();

    expect(t.ids()).toEqual([]);
    expect(t.ticker.status()).toBe("open");
  });
});

describe("close", () => {
  it("closes the source and clears a pending reconnect", () => {
    const t = setup();
    const source = latest();
    source.fail();
    t.ticker.close();

    expect(source.closed).toBe(true);
    expect(t.timers.size).toBe(0);
  });

  it("ignores late messages, errors and opens", () => {
    const t = setup();
    const source = latest();
    source.emit(1, tick());
    t.ticker.close();
    source.emit(2, tick());
    source.open();
    source.fail();
    t.flushFrames();

    expect(t.ids()).toEqual([]);
    expect(t.ticker.status()).toBe("connecting");
    expect(t.timers.size).toBe(0);
  });

  it("doesn't reconnect when a timer that couldn't be cleared fires later", () => {
    const t = setup({ clearTimer: undefined });
    latest().fail();
    t.ticker.close();
    t.fireTimers();

    expect(FakeSource.all).toHaveLength(1);
  });

  it("runs automatically when the owner is disposed", () => {
    const t = setup();
    const source = latest();
    t.dispose();

    expect(source.closed).toBe(true);
  });
});
