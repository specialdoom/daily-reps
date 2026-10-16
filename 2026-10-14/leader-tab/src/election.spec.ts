import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Msg, Role } from "./election";
import { HEARTBEAT_MS, LEADER_TIMEOUT_MS } from "./election";

/**
 * Harness: every "tab" is a fresh instance of ./election (vi.resetModules), so
 * each has its own tabId, signals and channel. They share one fake clock and an
 * in-memory BroadcastChannel bus.
 *
 * Timers and message handlers are tagged with the tab that registered them, so
 * a tab can be frozen (background throttling: its timers fire late, messages are
 * still delivered) or crashed (no more timers, no messages in or out).
 */

type Tab = {
  id: string;
  role: { value: Role };
  leaderId: { value: string | null };
  stop: () => void;
  /** startElection() again in the same tab, e.g. after a bfcache restore. */
  restart: () => void;
  history: Role[];
  frozen: boolean;
  dead: boolean;
  queued: Map<number, () => void>;
};

let current: Tab | null = null;
let tabs: Tab[] = [];
let sent: { tab: Tab | null; msg: Msg }[] = [];

function runAs<T>(tab: Tab | null, fn: () => T): T {
  const prev = current;
  current = tab;
  try {
    return fn();
  } finally {
    current = prev;
  }
}

class FakeChannel {
  static all: FakeChannel[] = [];
  onmessage: ((e: MessageEvent<Msg>) => void) | null = null;
  readonly owner = current;
  closed = false;
  constructor(readonly name: string) {
    FakeChannel.all.push(this);
  }
  postMessage(msg: Msg) {
    if (this.closed || this.owner?.dead) return;
    sent.push({ tab: this.owner, msg });
    const data = structuredClone(msg);
    for (const other of FakeChannel.all) {
      if (other === this || other.name !== this.name) continue;
      // Delivery is asynchronous, like the real thing.
      fakeSetTimeout(() => {
        if (other.closed || other.owner?.dead) return;
        runAs(other.owner, () =>
          other.onmessage?.(new MessageEvent("message", { data })),
        );
      }, 0);
    }
  }
  close() {
    this.closed = true;
  }
  addEventListener() {}
  removeEventListener() {}
}

let fakeSetTimeout: typeof setTimeout;
let fakeSetInterval: typeof setInterval;

function wrap(cb: () => void, timerId: () => number): () => void {
  const tab = current;
  return () => {
    if (tab?.dead) return;
    if (tab?.frozen) {
      // Throttled: the timer fires once, late, when the tab wakes up.
      tab.queued.set(timerId(), () => runAs(tab, cb));
      return;
    }
    runAs(tab, cb);
  };
}

function installTimers() {
  fakeSetTimeout = globalThis.setTimeout;
  fakeSetInterval = globalThis.setInterval;
  const st = ((cb: () => void, ms?: number) => {
    let id = 0;
    id = fakeSetTimeout(wrap(cb, () => id), ms) as unknown as number;
    return id;
  }) as unknown as typeof setTimeout;
  const si = ((cb: () => void, ms?: number) => {
    let id = 0;
    id = fakeSetInterval(wrap(cb, () => id), ms) as unknown as number;
    return id;
  }) as unknown as typeof setInterval;
  // A cleared timer must not fire when its throttled tab wakes up.
  const clear = (orig: (id?: number) => void) => (id?: number) => {
    for (const t of tabs) if (id !== undefined) t.queued.delete(id);
    orig(id);
  };
  vi.stubGlobal("setTimeout", st);
  vi.stubGlobal("setInterval", si);
  vi.stubGlobal("clearTimeout", clear(globalThis.clearTimeout as (id?: number) => void));
  vi.stubGlobal("clearInterval", clear(globalThis.clearInterval as (id?: number) => void));
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("BroadcastChannel", FakeChannel);
}

async function openTab(id: string): Promise<Tab> {
  vi.resetModules();
  vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(
    `${id}-0000-0000-0000-000000000000` as `${string}-${string}-${string}-${string}-${string}`,
  );
  const tab = {
    history: [],
    frozen: false,
    dead: false,
    queued: new Map(),
  } as unknown as Tab;
  current = tab;
  try {
    const mod = await import("./election");
    tab.id = mod.tabId;
    tab.role = mod.role;
    tab.leaderId = mod.leaderId;
    mod.role.subscribe((r) => tab.history.push(r));
    tab.stop = mod.startElection();
    tab.restart = () => runAs(tab, () => (tab.stop = mod.startElection()));
  } finally {
    current = null;
  }
  tabs.push(tab);
  return tab;
}

/** Tab closed without running any code: no resign, timers gone. */
function crash(tab: Tab) {
  tab.dead = true;
}

function freeze(tab: Tab) {
  tab.frozen = true;
}

function thaw(tab: Tab) {
  tab.frozen = false;
  const queued = [...tab.queued.values()];
  tab.queued.clear();
  queued.forEach((run) => run());
}

const alive = () => tabs.filter((t) => !t.dead);
const leaders = () => alive().filter((t) => t.role.value === "leader");
const advance = (ms: number) => vi.advanceTimersByTime(ms);

/** Advance in small steps and return the highest number of simultaneous leaders seen. */
function watchLeaders(ms: number, step = 10): number {
  let max = 0;
  for (let t = 0; t < ms; t += step) {
    advance(step);
    max = Math.max(max, leaders().length);
  }
  return max;
}

/** Time (ms) until `pred` holds, checked every 10 ms, or Infinity. */
function timeUntil(pred: () => boolean, limit: number): number {
  for (let t = 0; t <= limit; t += 10) {
    if (pred()) return t;
    advance(10);
  }
  return Infinity;
}

const promotions = (tab: Tab) =>
  tab.history.filter((r, i) => r === "leader" && tab.history[i - 1] !== "leader").length;

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  // Seeded, so the claim jitter after a resign is random but reproducible.
  let seed = 42;
  vi.spyOn(Math, "random").mockImplementation(() => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  });
  installTimers();
  FakeChannel.all = [];
  tabs = [];
  sent = [];
});

afterEach(() => {
  for (const t of tabs) t.dead = true;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("single tab", () => {
  it("claims leadership within about one timeout", async () => {
    const a = await openTab("aaaaaaaa");
    expect(a.role.value).toBe("follower");
    const t = timeUntil(() => a.role.value === "leader", 2 * LEADER_TIMEOUT_MS);
    expect(t).toBeLessThanOrEqual(LEADER_TIMEOUT_MS + 1000);
    expect(a.leaderId.value).toBe(a.id);
  });

  it("broadcasts a heartbeat every HEARTBEAT_MS while leader, and only one stream of them", async () => {
    const a = await openTab("aaaaaaaa");
    timeUntil(() => a.role.value === "leader", 2 * LEADER_TIMEOUT_MS);
    sent = [];
    advance(10 * HEARTBEAT_MS);
    const beats = sent.filter((s) => s.msg.type === "heartbeat");
    expect(beats.length).toBeGreaterThanOrEqual(9);
    expect(beats.length).toBeLessThanOrEqual(11);
    for (const b of beats) expect(b.msg).toMatchObject({ type: "heartbeat", from: a.id });
  });
});

describe("several tabs", () => {
  it("staggered tabs settle on exactly one leader that everyone agrees on", async () => {
    await openTab("aaaaaaaa");
    advance(300);
    await openTab("bbbbbbbb");
    advance(300);
    await openTab("cccccccc");
    expect(watchLeaders(3 * LEADER_TIMEOUT_MS)).toBe(1);
    const [leader] = leaders();
    for (const t of tabs) expect(t.leaderId.value).toBe(leader.id);
    // Settled: nobody flips any more.
    const before = tabs.map((t) => t.history.length);
    advance(20_000);
    expect(tabs.map((t) => t.history.length)).toEqual(before);
  });

  it("a tab opened while a leader exists stays follower and shows the leader's id", async () => {
    const a = await openTab("aaaaaaaa");
    timeUntil(() => a.role.value === "leader", 2 * LEADER_TIMEOUT_MS);
    const b = await openTab("ffffffff");
    advance(HEARTBEAT_MS + 10);
    expect(b.leaderId.value).toBe(a.id);
    advance(5 * LEADER_TIMEOUT_MS);
    expect(b.role.value).toBe("follower");
    expect(b.history).not.toContain("leader");
    expect(b.leaderId.value).toBe(a.id);
  });

  it("simultaneous claims converge to one leader quickly", async () => {
    await openTab("aaaaaaaa");
    await openTab("bbbbbbbb");
    await openTab("cccccccc");
    // All three time out in the same tick and claim together.
    timeUntil(() => leaders().length > 0, 2 * LEADER_TIMEOUT_MS);
    const t = timeUntil(() => leaders().length === 1, 5 * HEARTBEAT_MS);
    expect(t).toBeLessThanOrEqual(2 * HEARTBEAT_MS);
    expect(watchLeaders(20_000)).toBe(1);
    const [leader] = leaders();
    for (const t of tabs) expect(t.leaderId.value).toBe(leader.id);
  });
});

describe("failover", () => {
  async function threeTabs() {
    await openTab("aaaaaaaa");
    advance(170);
    await openTab("bbbbbbbb");
    advance(170);
    await openTab("cccccccc");
    advance(3 * LEADER_TIMEOUT_MS);
    expect(leaders()).toHaveLength(1);
    return leaders()[0];
  }

  it("a crashed leader is replaced by exactly one follower within about LEADER_TIMEOUT_MS", async () => {
    const leader = await threeTabs();
    for (const t of tabs) t.history.length = 0;
    crash(leader);
    const t = timeUntil(() => leaders().length > 0, 3 * LEADER_TIMEOUT_MS);
    expect(t).toBeLessThanOrEqual(LEADER_TIMEOUT_MS + HEARTBEAT_MS);
    expect(watchLeaders(10_000)).toBe(1);
    // A single follower took over: only one tab ever opened the feed.
    expect(alive().reduce((n, tab) => n + promotions(tab), 0)).toBe(1);
  });

  it("stop() on the leader resigns and a follower takes over well under a second", async () => {
    const leader = await threeTabs();
    for (const t of tabs) t.history.length = 0;
    leader.stop();
    expect(leader.role.value).toBe("follower");
    expect(sent.at(-1)?.msg).toEqual({ type: "resign", from: leader.id });
    const others = () => alive().filter((t) => t !== leader);
    const t = timeUntil(
      () => others().some((o) => o.role.value === "leader"),
      3 * LEADER_TIMEOUT_MS,
    );
    expect(t).toBeLessThan(500);
    expect(watchLeaders(10_000)).toBe(1);
    expect(others().reduce((n, tab) => n + promotions(tab), 0)).toBe(1);
    const [next] = leaders();
    for (const o of others()) expect(o.leaderId.value).toBe(next.id);
  });

  it("a stopped tab sends nothing more and never claims again", async () => {
    const leader = await threeTabs();
    leader.stop();
    const at = sent.length;
    advance(30_000);
    expect(sent.slice(at).filter((s) => s.tab === leader)).toEqual([]);
    expect(leader.role.value).toBe("follower");
  });

  it("stop() on a follower sends no resign", async () => {
    const leader = await threeTabs();
    const follower = alive().find((t) => t !== leader)!;
    sent = [];
    follower.stop();
    advance(10);
    expect(sent.filter((s) => s.msg.type === "resign")).toEqual([]);
    advance(20_000);
    expect(leaders()).toEqual([leader]);
    // The stopped tab must not take part in the next election either, even
    // when it is the only candidate left.
    for (const t of alive()) if (t !== leader && t !== follower) crash(t);
    leader.stop();
    advance(20_000);
    expect(follower.role.value).toBe("follower");
    expect(follower.history).not.toContain("leader");
  });

  it("ignores heartbeats from a tab that already resigned", async () => {
    // The resigned tab has the highest id, so its ghost would win a tie-break.
    const leader = await openTab("zzzzzzzz");
    advance(2 * LEADER_TIMEOUT_MS);
    await openTab("aaaaaaaa");
    await openTab("bbbbbbbb");
    advance(2 * LEADER_TIMEOUT_MS);
    expect(leaders()).toEqual([leader]);
    const ghostId = leader.id;
    const sentBeforeResign = Date.now();
    leader.stop();
    advance(2 * LEADER_TIMEOUT_MS);
    const [next] = leaders();
    expect(next).toBeDefined();
    // A heartbeat from the resigned tab, still in flight or replayed.
    const ghost = new BroadcastChannel("leader-tab");
    ghost.postMessage({ type: "heartbeat", from: ghostId, at: sentBeforeResign } satisfies Msg);
    advance(10);
    for (const t of alive().filter((t) => t !== leader)) {
      expect(t.leaderId.value).toBe(next.id);
    }
    expect(watchLeaders(10_000)).toBe(1);
    expect(leaders()).toEqual([next]);
  });

  it("a tab that resigned and rejoins (bfcache restore) is a candidate again", async () => {
    const z = await openTab("zzzzzzzz");
    advance(2 * LEADER_TIMEOUT_MS);
    const a = await openTab("aaaaaaaa");
    advance(170);
    const b = await openTab("bbbbbbbb");
    advance(2 * LEADER_TIMEOUT_MS);
    z.stop();
    advance(2 * LEADER_TIMEOUT_MS);
    const [next] = leaders();
    const other = next === a ? b : a;
    z.restart();
    advance(HEARTBEAT_MS + 10);
    expect(z.leaderId.value).toBe(next.id);
    // The leader crashes. `other` saw z resign earlier but must still treat
    // the rejoined z as a peer, or both lead forever.
    // Freeze `other` so z is the one to claim.
    crash(next);
    freeze(other);
    advance(3 * LEADER_TIMEOUT_MS);
    expect(leaders()).toEqual([z]);
    thaw(other);
    expect(watchLeaders(10_000)).toBe(1);
    const [final] = leaders();
    expect(other.leaderId.value).toBe(final.id);
    expect(z.leaderId.value).toBe(final.id);
  });

  it("a resign from a tab that is not the leader does not dethrone the leader", async () => {
    const leader = await threeTabs();
    const leaderBeats = () => sent.filter((s) => s.tab === leader && s.msg.type === "heartbeat").length;
    const ghost = new BroadcastChannel("leader-tab");
    ghost.postMessage({ type: "resign", from: "99999999" } satisfies Msg);
    advance(10);
    for (const t of alive()) expect(t.leaderId.value).toBe(leader.id);
    const before = leaderBeats();
    advance(10 * HEARTBEAT_MS);
    // Still exactly one heartbeat stream from the leader, nobody else claimed.
    expect(leaderBeats() - before).toBeLessThanOrEqual(11);
    expect(watchLeaders(10_000)).toBe(1);
    expect(leaders()).toEqual([leader]);
    leader.stop();
    const after = sent.length;
    advance(10_000);
    expect(sent.slice(after).filter((s) => s.tab === leader)).toEqual([]);
  });
});

describe("background throttling", () => {
  it("a leader throttled for 10 s gives way once and does not flap back", async () => {
    // The highest id: the one that wins a plain id tie-break, so the worst case.
    const z = await openTab("zzzzzzzz");
    advance(2 * LEADER_TIMEOUT_MS);
    await openTab("11111111");
    advance(170);
    await openTab("22222222");
    advance(2 * LEADER_TIMEOUT_MS);
    expect(z.role.value).toBe("leader");
    for (const t of tabs) t.history.length = 0;

    freeze(z);
    advance(10_000);
    const replacement = alive().filter((t) => t !== z && t.role.value === "leader");
    expect(replacement).toHaveLength(1);
    thaw(z);

    advance(30_000);
    expect(leaders()).toHaveLength(1);
    // The replacement keeps the job: it was promoted once and never demoted.
    expect(replacement[0].role.value).toBe("leader");
    expect(replacement[0].history).toEqual(["leader"]);
    expect(z.role.value).toBe("follower");
    for (const t of alive()) expect(t.leaderId.value).toBe(replacement[0].id);
  });

  it("a healthy leader whose heartbeats are a little late keeps the job", async () => {
    const a = await openTab("aaaaaaaa");
    advance(170);
    const b = await openTab("bbbbbbbb");
    advance(3 * LEADER_TIMEOUT_MS);
    const [leader] = leaders();
    const follower = leader === a ? b : a;
    for (const t of tabs) t.history.length = 0;
    // Chrome aligns hidden-tab timers to 1 s; simulate heartbeats up to ~2.5 s apart.
    for (let i = 0; i < 10; i++) {
      freeze(leader);
      advance(2500);
      thaw(leader);
    }
    expect(follower.history).not.toContain("leader");
    expect(leader.role.value).toBe("leader");
  });
});
