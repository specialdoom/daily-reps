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
}

export function createTicker(opts: TickerOptions) {
  const finalOptions = {
    limit: opts?.limit ?? 20,
    baseDelayMs: opts?.baseDelayMs ?? 500,
    maxDelayMs: opts?.maxDelayMs ?? 8000,
    setTimer: opts?.setTimer,
    createSource: opts?.createSource ?? ((url: string) => new EventSource(url)),
    url: opts.url,
  };
  let [ticks, setTicks] = createSignal<Tick[]>([]);
  let [status, setStatus] = createSignal<Status>("connecting");
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
    const batch = [...pending];
    pending = [];
    setTicks((v) => [...batch, ...v].slice(0, finalOptions.limit));
  }

  let eventSource = newEventSource();

  function newEventSource(url = finalOptions.url) {
    const eventSource = finalOptions.createSource(url);

    eventSource.addEventListener("message", (ev) => {
      if (isClosed) return;

      if (ev.data) {
        const numberId = Number(ev.lastEventId);
        if (numberId <= maxEventIdSeen) return;

        maxEventIdSeen = Math.max(maxEventIdSeen, numberId);

        pending = [
          {
            id: numberId,
            ...JSON.parse(ev.data),
          },
          ...pending,
        ];

        if (!isFlushScheduled) {
          isFlushScheduled = true;
          requestAnimationFrame(flush);
        }
      }
    });

    eventSource.addEventListener("error", (error) => {
      if (isClosed) return;

      eventSource.close();

      reconnect();
    });

    eventSource.addEventListener("open", () => {
      attempt = 0;
      setStatus("open");
    });

    return eventSource;
  }

  function connect() {
    setStatus("connecting");
  }

  function reconnect() {
    if (isReconnecting) return;

    isReconnecting = true;
    setStatus("reconnecting");

    const ms = Math.min(
      finalOptions.maxDelayMs,
      finalOptions.baseDelayMs * Math.pow(2, attempt),
    );

    reconnectingTimer =
      finalOptions?.setTimer?.(timerCallback, ms) ??
      setTimeout(timerCallback, ms);
  }

  function timerCallback() {
    if (isClosed) return;

    isReconnecting = false;
    eventSource = newEventSource(
      `${finalOptions.url}?lastEventId=${maxEventIdSeen}`,
    );
    attempt++;
  }

  function close() {
    isClosed = true;
    eventSource.close();
    clearTimeout(reconnectingTimer);
  }

  connect();

  if (getOwner()) onCleanup(close);

  return {
    ticks() {
      return ticks();
    },
    status() {
      return status();
    },
    close,
  };
}
