import type { scheduleHydration } from "../island-hydration";

export type Env = Parameters<typeof scheduleHydration>[2];

/** The real browser implementation of the scheduler's `Env`. */
export const domEnv: Env = {
  requestIdle(cb, timeout) {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(
        () => cb(),
        timeout === undefined ? undefined : { timeout },
      );
      return () => window.cancelIdleCallback(id);
    }
    // Safari has no requestIdleCallback: approximate "after current work" with a macrotask.
    const id = window.setTimeout(cb, timeout === undefined ? 1 : Math.min(timeout, 200));
    return () => window.clearTimeout(id);
  },

  observeVisible(el, cb, rootMargin) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) cb();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  },

  listen(el, event, cb) {
    const handler = () => cb();
    el.addEventListener(event, handler, { passive: true });
    return () => el.removeEventListener(event, handler);
  },
};
