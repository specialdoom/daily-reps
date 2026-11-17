### **Daily Frontend Challenge: [Real-time] At-Least-Once Is Not Exactly-Once: Resuming an SSE Stream Without Duplicates or Ghosts**

> **Focus:** idempotent client state for a resumable SSE stream (dedupe by sequence number, reset on a new server epoch) · **Time box:** ~40 min
> **Format:** Real-time app · **Stack:** SolidJS 1.9 (`solid-js@1.9.15`) + TypeScript + Vite 8, Node 22 mock SSE server

#### **Overview**
A price ticker, a build log or a notification feed keeps a Server-Sent Events stream open. `EventSource` reconnects on its own and sends `Last-Event-ID`, so many teams assume "it just works". Real servers replay a little too much to be safe (at-least-once), and a restarted server starts numbering from 1 again. The client state must tolerate both.

---

### **What You'll Learn**

**Core concept:** make "apply an event" an idempotent, epoch-aware reducer, so replayed or reordered deliveries never corrupt the list.

**By the end you should be able to:**
- explain what `Last-Event-ID` does, and what it does not guarantee
- implement an idempotent reducer that drops replayed events and detects gaps
- detect a server restart (new epoch) and reset state instead of silently ignoring "old" ids
- keep state referentially stable when an event is a no-op

**Skills practised:** SSE · `EventSource` · at-least-once delivery · idempotency · reducers · Solid signals

**Prerequisites:** basic `EventSource`, SolidJS signals (or any reactive library).

**Where this shows up in practice:** live dashboards, CI log tails, chat and notification feeds. The same reducer shape works for WebSocket resume tokens, Kafka offsets and Redux-style event handling.

**Self-check (answer after solving):**
1. Why does the server's overlap make the client's dedupe mandatory, and why is replaying too much safer than too little?
2. After a restart the new `seq` values are all smaller than `lastSeq`. What would a naive "ignore `seq <= lastSeq`" do?
3. A restart happens and the new `seq` grows past the old `lastSeq` before the client reconnects. Can seq alone detect it? What does the epoch add?

---

### **Why SolidJS?**
Solid updates the DOM through fine-grained signals instead of re-rendering components, so returning the *same* state object from a no-op event means nothing downstream re-runs at all. Docs: https://docs.solidjs.com

---

### **Starter**
The project lives in [`live-ticker/`](./live-ticker). Run the mock server and the app in two terminals:

```bash
cd live-ticker && npm install
npm run server   # SSE server on :8787 (don't edit server.mjs)
npm run dev      # Vite, proxies /events to the server
```

The server emits `id: <seq>` and a JSON tick every second and, on reconnect, replays **3 events more than requested**. Simulate trouble from a third terminal:

```bash
curl -X POST localhost:5173/__drop      # cut every connection; the browser reconnects itself
curl -X POST localhost:5173/__restart   # new epoch, seq starts again at 1
```

The app wiring in `src/App.tsx` is given. Only `applyTick` in `src/feed.ts` is yours; today it just prepends every event, so after a `__drop` you will see duplicate rows.

```ts
export type Tick = { epoch: string; seq: number; symbol: string; price: number };
export type FeedState = {
  epoch: string | null;
  lastSeq: number;            // highest seq applied in the current epoch
  missed: number;             // seqs skipped (gaps) in the current epoch
  items: readonly Tick[];     // newest first
};
export const MAX_ITEMS = 20;
export function applyTick(state: FeedState, tick: Tick): FeedState;
```

---

### **Detailed Requirements**
- **Idempotent:** a tick with the same `epoch` as the state and `seq <= lastSeq` is a replay. Return the **same `state` reference**.
- **Normal case:** same epoch and `seq > lastSeq`: prepend the tick, set `lastSeq`. If `seq > lastSeq + 1`, add the skipped count (`seq - lastSeq - 1`) to `missed`.
- **New epoch:** if `tick.epoch !== state.epoch` (including the very first tick, where it is `null`), start over: `items = [tick]`, `lastSeq = tick.seq`, `missed = 0`.
- **Bounded:** keep at most `MAX_ITEMS` items, dropping the oldest.
- Never mutate the incoming state or its `items` array. No `any`.

### **Acceptance Criteria**
- Run for ~10 s, then `__drop`: after reconnecting, the list contains each `#seq` exactly once, in descending order, with no gap (`missed: 0`).
- `__restart`: the list clears and restarts at `#1` under a new epoch shown in the status line. It does not stay frozen waiting for `seq > lastSeq`.
- The list never shows more than 20 rows.
- Stop the server for a few seconds with Ctrl+C and start it again: the page recovers and shows the new epoch without a reload.

---

### **Edge Cases & Performance Considerations**
- The three replayed events arrive as a burst; the last one may equal `lastSeq` exactly (off-by-one between `<` and `<=`).
- A tick from an *old* epoch arriving after a new one (a late packet) must not wipe the new state. Decide what the reducer does here and justify it.
- Stretch: make the reducer reject out-of-order ticks inside one epoch without losing them (insert by `seq`), and explain the cost.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite for `applyTick` or a Playwright spec for the drop/restart flows.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
