/** Challenge input */
type Strategy =
  | { kind: "load" }
  | { kind: "idle"; timeout?: number }
  | { kind: "visible"; rootMargin?: string }
  | { kind: "interaction"; events?: string[] }; // default ["pointerdown", "focusin"]
// a Strategy[] is also accepted: hydrate on whichever fires FIRST

type Cancel = () => void;
interface Island {
  el: Element;
  hydrate(): void;
}
interface Env {
  requestIdle(cb: () => void, timeout?: number): () => void; // returns cancel
  observeVisible(el: Element, cb: () => void, rootMargin?: string): () => void; // returns unobserve
  listen(el: Element, event: string, cb: () => void): () => void; // returns remove
}

/** Challenge solution */
export function scheduleHydration(
  island: Island,
  strategy: Strategy | Strategy[],
  env: Env,
): Cancel {
  let settled = false;
  const teardowns: (() => void)[] = [];

  const strategies: Strategy[] = Array.isArray(strategy)
    ? strategy
    : [strategy];

  const hasLoad = strategies.some((s) => s.kind === "load");

  if (hasLoad) {
    fire();
  } else {
    strategies.forEach((s) => {
      if (s.kind === "idle") {
        teardowns.push(env.requestIdle(fire, s.timeout));
      } else if (s.kind === "visible") {
        teardowns.push(env.observeVisible(island.el, fire, s.rootMargin));
      } else if (s.kind === "interaction") {
        let events = s.events ?? ["pointerdown", "focusin"];

        events.forEach((event) => {
          teardowns.push(env.listen(island.el, event, fire));
        });
      }
    });
  }

  function teardownAll() {
    let errors: unknown[] = [];
    teardowns.forEach((teardown) => {
      try {
        teardown();
      } catch (e) {
        errors.push(e);
      }
    });

    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors);
    }
  }

  function fire() {
    if (settled) return;

    settled = true;
    teardownAll();

    island.hydrate();
  }

  return () => {
    if (settled) return;

    settled = true;
    teardownAll();
  };
}
