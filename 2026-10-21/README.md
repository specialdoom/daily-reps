### **Daily Frontend Challenge: [Real-time] Resume the Stream: `Last-Event-ID`, Backoff and Duplicates over SSE**

> **Focus:** resuming a Server-Sent Events stream from a cursor without gaps or duplicates · **Time box:** ~45 min
> **Format:** Real-time app · **Stack:** Hono 4 (`hono@4.13.13`, mock server) + vanilla TypeScript + Vite 8

#### **Overview**
A live price feed runs over SSE. Connections drop all the time: deploys, mobile networks, proxies. The browser's built-in `EventSource` reconnects and sends `Last-Event-ID` for you, but it gives up on a 503 and retries at a fixed pace. So production clients close it and reconnect themselves, and a fresh `EventSource` forgets the cursor. You'll build that reconnect loop so the UI sees every tick exactly once, in order.

---

### **What You'll Learn**

**Core concept:** treating the last seen event id as a resume cursor across reconnects, with at-least-once delivery on the wire and exactly-once at the UI.

**By the end you should be able to:**
- Explain what `EventSource` does on its own after a drop, and when it stops doing it.
- Implement reconnect with capped exponential backoff and jitter.
- Resume from the last id when you can't set headers (`?lastEventId=`).
- Drop replayed duplicates and surface a gap when the server says history is gone.

**Skills practised:** SSE · EventSource · reconnection and backoff · idempotent consumers · Hono

**Prerequisites:** `EventSource` basics, timers, TypeScript.

**Where this shows up in practice:** live dashboards, notification feeds, log tailing and LLM token streams. WebSocket clients need the same cursor logic, only hand-rolled.

**Self-check (answer after solving):**
1. Why does the native `EventSource` send `Last-Event-ID` but a new one you create after `close()` doesn't?
2. The server replays two events before your cursor. Why is that a good server design, and where must you pay for it?
3. What should the UI do when the server answers `reset`?

---

### **Why Hono?**
Hono is a tiny, Web-standards-based server framework that runs on Node, Bun, Deno and edge runtimes, and ships `streamSSE` for SSE responses. See the [Hono streaming docs](https://hono.dev/docs/helpers/streaming).

---

### **Starter**
The project is in [`resume-feed/`](./resume-feed). Run it with:

```bash
cd resume-feed && npm install
npm run server   # terminal 1: mock SSE server on :8787
npm run dev      # terminal 2: Vite, proxies /events to the server
```

`src/feed.ts` has the types and an empty `connectFeed()` (it throws, so the page shows nothing yet); `src/main.ts` renders ticks, status and a gap counter. The mock server (`server/server.ts`, don't edit it):

- emits one tick per 400 ms with ids `1, 2, 3, …` and keeps the last 40;
- closes every connection after 6 events;
- answers every 4th connection attempt with `503`;
- resumes from `Last-Event-ID` or `?lastEventId=`, starting **2 events early** (duplicates);
- sends `event: reset` first if the cursor is older than what it retains.

---

### **Detailed Requirements**
Implement `connectFeed(url, opts): () => void` in `src/feed.ts` with the given `Tick`, `Status` and `FeedOptions` types.

- Open an `EventSource` on `url`. Report `connecting` → `open`; after a failure report `reconnecting`; after the returned stop function is called report `closed`.
- On `error`, `close()` the source yourself and reconnect after a delay of `min(30_000, 500 * 2^attempt)` ms with jitter. Reset the attempt counter once a tick arrives.
- When reconnecting, pass the last delivered id as `?lastEventId=<id>` (append correctly if `url` already has a query).
- Call `onTick` once per id, in increasing order: ignore any tick whose id is not greater than the last delivered one.
- On a `reset` event, call `onGap()` and accept the next tick as the new baseline, even though its id is far above the cursor.
- The stop function cancels pending timers and closes the source. No `any`; strict TypeScript.

### **Acceptance Criteria**
- The "Received" count equals the number of distinct ids shown; the log never shows an id twice or out of order.
- Killing the server for 20+ seconds and restarting it: status shows `reconnecting` with growing delays, then returns to `open`.
- After a long outage (more than ~16 s of ticks lost) the gap counter goes up by exactly one and the feed continues.
- With the DevTools Network tab open, each reconnect request carries `lastEventId`.
- Navigating away or calling stop leaves no reconnect timer behind.

---

### **Edge Cases & Performance Considerations**
- **Error then stale events:** after you `close()` a source, a late event from it must not reach `onTick`.
- **Reconnect storms:** without jitter, a server restart makes every client retry at the same instant.
- **Stop during backoff:** stopping while a timer is pending must prevent the next connection.

*Stretch goal:* use the `retry:` field from the server, if present, as the minimum delay.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite (fake `EventSource` + fake timers) or a Playwright spec that kills the server.
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
