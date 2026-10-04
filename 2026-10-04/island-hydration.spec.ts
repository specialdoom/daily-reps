import { describe, expect, it, vi } from "vitest";
import { scheduleHydration } from "./island-hydration.js";

// Derived from the signature so this spec also runs against before-review,
// which does not export its types.
type Env = Parameters<typeof scheduleHydration>[2];

type Registration = {
  kind: "idle" | "visible" | "listen";
  cb: () => void;
  el?: Element;
  timeout?: number;
  rootMargin?: string;
  event?: string;
  teardownCalls: number;
};

/**
 * Fake env that records every registration and how many times each
 * teardown ran. `trigger` simulates the browser firing a callback.
 */
function createEnv(overrides: Partial<Env> = {}) {
  const registrations: Registration[] = [];

  function add(registration: Omit<Registration, "teardownCalls">) {
    const entry: Registration = { ...registration, teardownCalls: 0 };
    registrations.push(entry);
    return () => {
      entry.teardownCalls++;
    };
  }

  const env: Env = {
    requestIdle: (cb, timeout) => add({ kind: "idle", cb, timeout }),
    observeVisible: (el, cb, rootMargin) => add({ kind: "visible", cb, el, rootMargin }),
    listen: (el, event, cb) => add({ kind: "listen", cb, el, event }),
    ...overrides,
  };

  function find(kind: Registration["kind"], event?: string) {
    const found = registrations.find(
      (r) => r.kind === kind && (event === undefined || r.event === event),
    );
    if (!found) throw new Error(`no ${kind} ${event ?? ""} registration`);
    return found;
  }

  return {
    env,
    registrations,
    trigger: (kind: Registration["kind"], event?: string) => find(kind, event).cb(),
    teardownCounts: () => registrations.map((r) => r.teardownCalls),
  };
}

function createIsland(hydrate: () => void = () => {}) {
  const el = { tagName: "DIV" } as unknown as Element;
  return { el, hydrate: vi.fn(hydrate) };
}

describe("scheduleHydration", () => {
  describe("single strategies", () => {
    it("load hydrates synchronously and registers nothing", () => {
      const { env, registrations } = createEnv();
      const island = createIsland();

      scheduleHydration(island, { kind: "load" }, env);

      expect(island.hydrate).toHaveBeenCalledTimes(1);
      expect(registrations).toHaveLength(0);
    });

    it("idle delegates to requestIdle with the timeout and hydrates when it fires", () => {
      const { env, registrations, trigger } = createEnv();
      const island = createIsland();

      scheduleHydration(island, { kind: "idle", timeout: 500 }, env);

      expect(registrations).toMatchObject([{ kind: "idle", timeout: 500 }]);
      expect(island.hydrate).not.toHaveBeenCalled();

      trigger("idle");
      expect(island.hydrate).toHaveBeenCalledTimes(1);
    });

    it("visible observes the island element with the rootMargin", () => {
      const { env, registrations, trigger } = createEnv();
      const island = createIsland();

      scheduleHydration(island, { kind: "visible", rootMargin: "200px" }, env);

      expect(registrations).toMatchObject([{ kind: "visible", el: island.el, rootMargin: "200px" }]);
      trigger("visible");
      expect(island.hydrate).toHaveBeenCalledTimes(1);
    });

    it("interaction defaults to pointerdown and focusin on the island element", () => {
      const { env, registrations, trigger } = createEnv();
      const island = createIsland();

      scheduleHydration(island, { kind: "interaction" }, env);

      expect(registrations.map((r) => r.event)).toEqual(["pointerdown", "focusin"]);
      expect(registrations.every((r) => r.el === island.el)).toBe(true);

      trigger("listen", "focusin");
      expect(island.hydrate).toHaveBeenCalledTimes(1);
    });

    it("interaction uses custom events when given", () => {
      const { env, registrations } = createEnv();

      scheduleHydration(createIsland(), { kind: "interaction", events: ["mouseenter", "keydown", "touchstart"] }, env);

      expect(registrations.map((r) => r.event)).toEqual(["mouseenter", "keydown", "touchstart"]);
    });

    it("hydrating removes the listener for every interaction event", () => {
      const { env, trigger, teardownCounts } = createEnv();

      scheduleHydration(createIsland(), { kind: "interaction" }, env);
      trigger("listen", "pointerdown");

      expect(teardownCounts()).toEqual([1, 1]);
    });
  });

  describe("multiple strategies", () => {
    it("hydrates once on the first trigger and tears every trigger down exactly once", () => {
      const { env, trigger, teardownCounts } = createEnv();
      const island = createIsland();

      scheduleHydration(island, [{ kind: "idle" }, { kind: "visible" }, { kind: "interaction" }], env);
      trigger("visible");

      expect(island.hydrate).toHaveBeenCalledTimes(1);
      expect(teardownCounts()).toEqual([1, 1, 1, 1]);
    });

    it("simultaneous triggers in the same tick hydrate only once", () => {
      const { env, trigger, teardownCounts } = createEnv();
      const island = createIsland();

      scheduleHydration(island, [{ kind: "visible" }, { kind: "idle" }], env);
      trigger("visible");
      trigger("idle");
      trigger("visible");

      expect(island.hydrate).toHaveBeenCalledTimes(1);
      expect(teardownCounts()).toEqual([1, 1]);
    });

    it("stretch: load combined with other strategies registers nothing", () => {
      const { env, registrations } = createEnv();
      const island = createIsland();

      scheduleHydration(island, [{ kind: "idle" }, { kind: "visible" }, { kind: "load" }], env);

      expect(island.hydrate).toHaveBeenCalledTimes(1);
      expect(registrations).toHaveLength(0);
    });
  });

  describe("cancel", () => {
    it("tears down every pending trigger and prevents hydration", () => {
      const { env, trigger, teardownCounts } = createEnv();
      const island = createIsland();

      const cancel = scheduleHydration(island, [{ kind: "idle" }, { kind: "interaction" }], env);
      cancel();

      expect(teardownCounts()).toEqual([1, 1, 1]);
      // A callback that was already queued and fires late must not hydrate.
      trigger("idle");
      expect(island.hydrate).not.toHaveBeenCalled();
    });

    it("is safe to call more than once", () => {
      const { env, teardownCounts } = createEnv();

      const cancel = scheduleHydration(createIsland(), [{ kind: "idle" }, { kind: "visible" }], env);
      cancel();
      cancel();
      cancel();

      expect(teardownCounts()).toEqual([1, 1]);
    });

    it("is a no-op after hydration", () => {
      const { env, trigger, teardownCounts } = createEnv();
      const island = createIsland();

      const cancel = scheduleHydration(island, [{ kind: "idle" }, { kind: "visible" }], env);
      trigger("idle");
      cancel();

      expect(island.hydrate).toHaveBeenCalledTimes(1);
      expect(teardownCounts()).toEqual([1, 1]);
    });

    it("is a no-op after a load hydration", () => {
      const island = createIsland();
      const cancel = scheduleHydration(island, { kind: "load" }, createEnv().env);

      expect(() => cancel()).not.toThrow();
      expect(island.hydrate).toHaveBeenCalledTimes(1);
    });
  });

  describe("throwing hydrate", () => {
    it("propagates the error to the trigger's caller after tearing everything down", () => {
      const { env, trigger, teardownCounts } = createEnv();
      const island = createIsland(() => {
        throw new Error("boom");
      });

      const cancel = scheduleHydration(island, [{ kind: "idle" }, { kind: "visible" }, { kind: "interaction" }], env);

      expect(() => trigger("idle")).toThrow("boom");
      expect(teardownCounts()).toEqual([1, 1, 1, 1]);

      // Later triggers and cancel stay no-ops.
      expect(() => trigger("visible")).not.toThrow();
      cancel();
      expect(island.hydrate).toHaveBeenCalledTimes(1);
      expect(teardownCounts()).toEqual([1, 1, 1, 1]);
    });

    it("propagates the error from a load hydration to the scheduleHydration caller", () => {
      const island = createIsland(() => {
        throw new Error("load boom");
      });

      expect(() => scheduleHydration(island, { kind: "load" }, createEnv().env)).toThrow("load boom");
    });
  });

  describe("throwing teardowns", () => {
    function throwingIdleEnv(message = "idle teardown failed") {
      const fake = createEnv();
      const { requestIdle } = fake.env;
      fake.env.requestIdle = (cb, timeout) => {
        const teardown = requestIdle(cb, timeout);
        return () => {
          teardown();
          throw new Error(message);
        };
      };
      return fake;
    }

    it("cancel still runs the other teardowns and rethrows the error", () => {
      const { env, teardownCounts } = throwingIdleEnv();

      const cancel = scheduleHydration(createIsland(), [{ kind: "idle" }, { kind: "visible" }], env);

      expect(() => cancel()).toThrow("idle teardown failed");
      expect(teardownCounts()).toEqual([1, 1]);

      // A second cancel must not run any teardown again.
      expect(() => cancel()).not.toThrow();
      expect(teardownCounts()).toEqual([1, 1]);
    });

    it("several failing teardowns are reported together as an AggregateError", () => {
      const fake = throwingIdleEnv();
      const { observeVisible } = fake.env;
      fake.env.observeVisible = (el, cb, rootMargin) => {
        observeVisible(el, cb, rootMargin);
        return () => {
          throw new Error("unobserve failed");
        };
      };

      const cancel = scheduleHydration(createIsland(), [{ kind: "idle" }, { kind: "visible" }], fake.env);

      let caught: unknown;
      try {
        cancel();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(AggregateError);
      expect((caught as AggregateError).errors.map((e: Error) => e.message)).toEqual([
        "idle teardown failed",
        "unobserve failed",
      ]);
    });

    // Review finding 1
    it("a failing teardown does not stop the island from hydrating", () => {
      const { env, trigger } = throwingIdleEnv();
      const island = createIsland();

      scheduleHydration(island, [{ kind: "idle" }, { kind: "visible" }], env);

      expect(() => trigger("visible")).toThrow("idle teardown failed");
      expect(island.hydrate).toHaveBeenCalledTimes(1);
    });
  });

  describe("robustness", () => {
    // Review finding 2
    it("a registration that throws tears down the triggers registered before it", () => {
      const { env, teardownCounts } = createEnv({
        observeVisible: () => {
          throw new SyntaxError("rootMargin must be specified in pixels or percent");
        },
      });
      const island = createIsland();

      expect(() =>
        scheduleHydration(island, [{ kind: "idle" }, { kind: "visible", rootMargin: "200" }], env),
      ).toThrow(SyntaxError);
      expect(teardownCounts()).toEqual([1]);
      expect(island.hydrate).not.toHaveBeenCalled();
    });

    // Review finding 3
    it("a trigger that fires during registration leaks nothing", () => {
      const fake = createEnv();
      const { observeVisible } = fake.env;
      // Element is already in view: the callback runs before observeVisible returns.
      fake.env.observeVisible = (el, cb, rootMargin) => {
        const unobserve = observeVisible(el, cb, rootMargin);
        cb();
        return unobserve;
      };
      const island = createIsland();

      scheduleHydration(island, [{ kind: "idle" }, { kind: "visible" }, { kind: "interaction" }], fake.env);

      expect(island.hydrate).toHaveBeenCalledTimes(1);
      // Every trigger that was registered has been torn down exactly once.
      expect(fake.registrations.every((r) => r.teardownCalls === 1)).toBe(true);
    });
  });
});
