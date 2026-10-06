import { createSignal } from "solid-js";

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
  const mergedOptions: TickerOptions = {
    limit: 20,
    baseDelayMs: 500,
    maxDelayMs: 8000,
    ...opts,
  };
  let [ticks, setTicks] = createSignal<Tick[]>([]);
  let [status, setStatus] = createSignal<Status>("open");
  let attempt = 0;
  let reconnectingTimer: number | undefined;

  let eventSource = new EventSource(mergedOptions.url);

  function connect() {
    setStatus("connecting");

    eventSource.addEventListener("message", (ev) => {
      if (ev.data) {
        setTicks((v) => [
          {
            id: ev.lastEventId,
            ...ev.data,
          },
          ...v,
        ]);
      }
    });

    eventSource.addEventListener("error", (error) => {
      eventSource.close();

      reconnect();
    });
  }

  connect();

  function reconnect() {
    setStatus("reconnecting");
    eventSource = new EventSource(
      `${mergedOptions.url}?lastEventId=${ticks()[0].id}`,
    );

    attempt++;

    while (!eventSource.OPEN) {
      reconnectingTimer = setTimeout(
        () => {
          eventSource = new EventSource(
            `${mergedOptions.url}?lastEventId=${ticks()[0].id}`,
          );
        },
        Math.min(
          mergedOptions.maxDelayMs,
          mergedOptions.baseDelayMs * Math.pow(2, attempt),
        ),
      );
    }

    attempt = 0;
    setStatus("open");
    clearTimeout(reconnectingTimer);
  }

  return {
    ticks() {
      return ticks().slice(0, mergedOptions.limit);
    },
    status() {
      return status();
    },
    close() {
      eventSource.close();
      clearTimeout(reconnectingTimer);
    },
  };
}
