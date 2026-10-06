### **Daily Frontend Challenge: [Real-time] Gap-Free Live Ticker over SSE with `Last-Event-ID` Resume**

> **Focus:** resuming a Server-Sent Events stream after a drop without losing or duplicating events · **Time box:** ~45 min
> **Format:** Real-time app · **Stack:** SolidJS 1.9 (`solid-js@1.9.15`) + TypeScript + Vite

#### **Overview**
A live price ticker or activity feed is only trustworthy if it never silently skips an update and never shows the same one twice. Browsers' `EventSource` reconnects on its own, but production code often needs more control: a reconnect with backoff, a visible connection status, and a guarantee that the list is gap-free and deduplicated after resuming from the last seen event id. Your job is to write a single Solid primitive, `createTicker`, that owns this behaviour.

---

### **Why SolidJS?**
Solid compiles JSX to direct DOM updates driven by fine-grained signals, with no virtual DOM. A live feed that pushes many small updates is exactly where this model shines, because only the changed rows touch the DOM. See the [Solid docs](https://docs.solidjs.com/).

---

### **Starter**

Mock server (`server.mjs`, run with `node server.mjs`, needs no packages). It emits an event with an incrementing numeric `id` every 500 ms, honours the `Last-Event-ID` header by replaying everything after it from a small buffer, and randomly drops the connection:

```js
import http from 'node:http';

const history = []; // { id, data }
let nextId = 1;
setInterval(() => {
  history.push({ id: nextId, data: JSON.stringify({ symbol: 'ACME', price: +(100 + Math.random() * 5).toFixed(2) }) });
  nextId++;
  if (history.length > 200) history.shift();
}, 500);

http.createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    'access-control-allow-origin': '*',
  });
  const last = Number(req.headers['last-event-id'] ?? 0);
  let sent = last;
  const timer = setInterval(() => {
    for (const e of history) {
      if (e.id > sent) { res.write(`id: ${e.id}\ndata: ${e.data}\n\n`); sent = e.id; }
    }
    if (Math.random() < 0.05) { clearInterval(timer); res.destroy(); } // simulate a drop
  }, 250);
  req.on('close', () => clearInterval(timer));
}).listen(3001);
```

Scaffold: `npm create vite@latest ticker -- --template solid-ts`. Types and the injected dependencies you must code against:

```ts
export type Tick = { id: number; symbol: string; price: number };
export type Status = 'connecting' | 'open' | 'reconnecting';

export interface TickerOptions {
  url: string;
  limit?: number;                                   // max ticks kept, default 20
  baseDelayMs?: number;                             // default 500
  maxDelayMs?: number;                              // default 8000
  createSource?: (url: string) => EventSource;      // injectable for tests
  setTimer?: (fn: () => void, ms: number) => number; // injectable for tests
}

export function createTicker(opts: TickerOptions): {
  ticks: () => Tick[];      // newest first
  status: () => Status;
  close: () => void;
};
```

---

### **Detailed Requirements**
- `ticks()` is a Solid signal accessor returning at most `limit` ticks, **newest first**, each `id` unique.
- Drop duplicates and out-of-order stale events: ignore any event whose `id` is `<=` the highest id already seen. (Servers replaying from a buffer can overlap.)
- On `error`, close the source yourself (don't rely on the built-in retry), set `status` to `'reconnecting'`, and reconnect after an exponential backoff `min(maxDelayMs, baseDelayMs * 2^attempt)`. Reset `attempt` to 0 after a successful `open`.
- When reconnecting, the new connection must resume from the last seen id. Native `EventSource` cannot set headers on a fresh instance, so pass it as a query parameter, e.g. `?lastEventId=<id>`, and note in a comment what the server would do with it (the mock server above reads the header; adapt the one line to also read the query).
- `close()` stops everything: closes the source, clears any pending reconnect timer, and ignores late events. Call it automatically with Solid's `onCleanup` when created inside a reactive owner.

### **Acceptance Criteria**
- With the mock server running, the list updates about twice a second with strictly decreasing ids from top to bottom.
- Kill and restart the server (or wait for a simulated drop): the status badge shows "reconnecting", then returns to "open", and the ids in the list have **no gaps and no repeats** across the drop.
- Unmounting the component stops all network activity (check the Network tab: no further reconnect attempts).
- Playwright (optional): block the SSE route once with `page.route`, assert the badge text goes `reconnecting` → `open`, and assert the rendered ids form a contiguous descending sequence.

---

### **Edge Cases & Performance Considerations**
- `error` fires twice before your timer does (some browsers); only one reconnect may be scheduled.
- `close()` called while a reconnect timer is pending, or while an old source still delivers a late message.
- Burst of replayed events after a long drop: keep updates cheap (batch them in a single signal write) so the list renders once, not once per event.
- Stretch: add jitter (±20%) to the backoff using an injected `random`.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite (fake `EventSource` + fake timers) or a starter project.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
