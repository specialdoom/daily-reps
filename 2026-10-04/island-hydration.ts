/**
 * Island hydration scheduler (reviewed version).
 *
 * Review findings, most important first:
 *  1. A throwing teardown blocked hydration. `fire()` ran `teardownAll()`
 *     before `island.hydrate()`, so if any teardown threw (a third-party
 *     observer's unobserve, say), the island never hydrated, even though the
 *     user had just scrolled to it or clicked it. `settled` was already true,
 *     so no later trigger could recover it either.
 *  2. A throwing registration leaked the triggers registered before it.
 *     `new IntersectionObserver(cb, { rootMargin: "200" })` throws because the
 *     unit is missing. If that is the second strategy, the idle callback from
 *     the first stays scheduled, and the caller never gets a `Cancel` to
 *     remove it.
 *  3. A trigger that fired synchronously during registration leaked its own
 *     teardown and every trigger after it. (An env can report "already
 *     visible" from inside `observeVisible`, or use a sync `requestIdle`
 *     polyfill in tests or SSR.) `fire()` ran over a partial `teardowns` list,
 *     because the firing trigger's teardown is only pushed after the `env`
 *     call returns, and the loop then kept registering. It is the same class
 *     of bug as `load` in the middle of the array, which the rough version
 *     already handled.
 *  4. `Strategy`, `Cancel`, `Island` and `Env` were not exported, so callers
 *     (such as the example's DOM env) had to recover them with
 *     `Parameters<typeof scheduleHydration>`.
 *  5. Minor: `let` where nothing is reassigned, the default events array was
 *     rebuilt on every call, `fire`/`teardownAll` were declared below their
 *     first use (works through hoisting, but reads out of order), and the
 *     `if`/`else if` chain had no exhaustiveness check, so a new strategy kind
 *     would be silently ignored.
 *
 * Kept from the rough version: the single `settled` flag for both
 * "hydrated" and "cancelled", claiming it before anything that can throw,
 * per-teardown try/catch with AggregateError, and the `load` short-circuit.
 */

/** Challenge input */
// Review (finding 4): exported so callers can name these types directly.
export type Strategy =
  | { kind: "load" }
  | { kind: "idle"; timeout?: number }
  | { kind: "visible"; rootMargin?: string }
  | { kind: "interaction"; events?: string[] }; // default ["pointerdown", "focusin"]
// a Strategy[] is also accepted: hydrate on whichever fires FIRST

export type Cancel = () => void;
export interface Island {
  el: Element;
  hydrate(): void;
}
export interface Env {
  requestIdle(cb: () => void, timeout?: number): () => void; // returns cancel
  observeVisible(el: Element, cb: () => void, rootMargin?: string): () => void; // returns unobserve
  listen(el: Element, event: string, cb: () => void): () => void; // returns remove
}

// Review (finding 5): allocated once instead of on every call.
const DEFAULT_INTERACTION_EVENTS: readonly string[] = ["pointerdown", "focusin"];

/** Challenge solution */
export function scheduleHydration(
  island: Island,
  strategy: Strategy | Strategy[],
  env: Env,
): Cancel {
  let settled = false;
  let teardowns: (() => void)[] = [];

  // Review: swapping the array out before running it means a teardown can't
  // run twice even if this is somehow reached again, and the settled island
  // stops holding on to the teardown closures (observers, handlers).
  function teardownAll() {
    const pending = teardowns;
    teardowns = [];

    const errors: unknown[] = [];
    for (const teardown of pending) {
      try {
        teardown();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, "Several hydration triggers failed to tear down");
    }
  }

  function fire() {
    if (settled) return;
    settled = true;

    // Review (finding 1): `finally` hydrates even if a teardown throws. The
    // teardown error still propagates afterwards. If `hydrate` throws too, its
    // error wins, because that is the one the README requires the caller to see.
    try {
      teardownAll();
    } finally {
      island.hydrate();
    }
  }

  function cancel() {
    if (settled) return;
    settled = true;
    teardownAll();
  }

  // Review (finding 3): if the trigger fired while we were registering it,
  // `fire()` has already run, so this teardown must run now instead of being
  // stored where nothing will ever call it.
  function register(subscribe: () => () => void) {
    const teardown = subscribe();
    if (settled) teardown();
    else teardowns.push(teardown);
  }

  const strategies = Array.isArray(strategy) ? strategy : [strategy];

  if (strategies.some((s) => s.kind === "load")) {
    fire();
    return cancel;
  }

  try {
    for (const s of strategies) {
      // Review (finding 3): an earlier trigger already fired, so stop registering.
      if (settled) break;

      switch (s.kind) {
        case "idle":
          register(() => env.requestIdle(fire, s.timeout));
          break;
        case "visible":
          register(() => env.observeVisible(island.el, fire, s.rootMargin));
          break;
        case "interaction":
          for (const event of s.events ?? DEFAULT_INTERACTION_EVENTS) {
            register(() => env.listen(island.el, event, fire));
          }
          break;
        case "load":
          break; // handled above
        default: {
          // Review (finding 5): a new Strategy kind fails to compile here.
          const unknownStrategy: never = s;
          throw new Error(`Unknown hydration strategy: ${JSON.stringify(unknownStrategy)}`);
        }
      }
    }
  } catch (error) {
    // Review (finding 2): undo what was registered before the failure, then
    // let the caller see the original error.
    try {
      cancel();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Hydration trigger registration failed");
    }
    throw error;
  }

  return cancel;
}
