import { createSignal, getOwner, onCleanup } from "solid-js";

export type Tick = { id: number; symbol: string; price: number };
export type Status = "connecting" | "open" | "reconnecting";

export interface TickerOptions {
  url: string;
  limit?: number; // max ticks kept, default 20
  baseDelayMs?: number; // default 500
  maxDelayMs?: number; // default 8000
  createSource?: (url: string) => EventSource; // injectable for tests
  setTimer?: (fn: () => void, ms: number) => number; // injectable for tests
  // Additions to the README's interface, so that everything time-based can be
  // injected: cancelling a timer from setTimer, and scheduling the batched write.
  clearTimer?: (id: number) => void;
  scheduleFlush?: (fn: () => void) => void;
}

export function createTicker(opts: TickerOptions) {
  const finalOptions = {
    limit: opts.limit ?? 20,
    baseDelayMs: opts.baseDelayMs ?? 500,
    maxDelayMs: opts.maxDelayMs ?? 8000,
    createSource: opts.createSource ?? ((url: string) => new EventSource(url)),
    // An injected setTimer comes with its own clearTimer (or none); clearTimeout
    // only understands ids from setTimeout.
    setTimer: opts.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms)),
    clearTimer: opts.setTimer ? opts.clearTimer : clearTimeout,
    // requestAnimationFrame doesn't exist during SSR or in Node.
    scheduleFlush:
      opts.scheduleFlush ??
      ((fn: () => void) =>
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(fn)
          : setTimeout(fn, 16)),
    url: opts.url,
  };
  const [ticks, setTicks] = createSignal<Tick[]>([]);
  const [status, setStatus] = createSignal<Status>("connecting");
  let attempt = 0;
  let reconnectingTimer: number | undefined;
  let maxEventIdSeen = 0;
  let isReconnecting = false;
  let isClosed = false;
  let pending: Tick[] = [];
  let isFlushScheduled = false;

  function flush() {
    isFlushScheduled = false;
    if (isClosed) return;
    const batch = pending;
    pending = [];
    setTicks((v) => [...batch, ...v].slice(0, finalOptions.limit));
  }

  let eventSource = newEventSource(finalOptions.url);

  function newEventSource(url: string) {
    const source = finalOptions.createSource(url);
    // Events can still be queued on a source after it was closed or replaced.
    const isCurrent = () => !isClosed && source === eventSource;

    source.addEventListener("message", (ev) => {
      if (!isCurrent() || !ev.data) return;

      const numberId = Number(ev.lastEventId);
      // A non-numeric id would make maxEventIdSeen NaN and turn dedup off.
      if (!Number.isFinite(numberId) || numberId <= maxEventIdSeen) return;

      let payload: Omit<Tick, "id">;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        // Not marked as seen, so a valid replay of this id is still accepted.
        return;
      }
      maxEventIdSeen = numberId;

      // id last, so a payload field can't replace the event id.
      // Capped here too: rAF doesn't run in background tabs, so a hidden tab
      // would otherwise buffer every event until it becomes visible again.
      pending = [{ ...payload, id: numberId }, ...pending].slice(
        0,
        finalOptions.limit,
      );

      if (!isFlushScheduled) {
        isFlushScheduled = true;
        finalOptions.scheduleFlush(flush);
      }
    });

    source.addEventListener("error", () => {
      if (!isCurrent()) return;

      source.close();

      reconnect();
    });

    source.addEventListener("open", () => {
      if (!isCurrent()) return;

      attempt = 0;
      setStatus("open");
    });

    return source;
  }

  function reconnect() {
    if (isReconnecting) return;

    isReconnecting = true;
    setStatus("reconnecting");

    const ms = Math.min(
      finalOptions.maxDelayMs,
      finalOptions.baseDelayMs * Math.pow(2, attempt),
    );

    reconnectingTimer = finalOptions.setTimer(timerCallback, ms);
  }

  function timerCallback() {
    // An injected timer may not have been cancellable.
    if (isClosed) return;

    isReconnecting = false;
    reconnectingTimer = undefined;
    eventSource = newEventSource(resumeUrl());
    attempt++;
  }

  /**
   * A new EventSource can't set the Last-Event-ID header, so the last seen id
   * goes in the query instead. The server reads the header when present
   * (browser auto-retry, other clients) and falls back to ?lastEventId.
   */
  function resumeUrl() {
    const url = new URL(finalOptions.url, globalThis.location?.href);
    url.searchParams.set("lastEventId", String(maxEventIdSeen));
    return url.toString();
  }

  function close() {
    isClosed = true;
    eventSource.close();
    if (reconnectingTimer !== undefined) {
      finalOptions.clearTimer?.(reconnectingTimer);
      reconnectingTimer = undefined;
    }
  }

  if (getOwner()) onCleanup(close);

  return {
    ticks,
    status,
    close,
  };
}
