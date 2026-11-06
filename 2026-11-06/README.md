### **Daily Frontend Challenge: [Real-time] Who Else Is Here? Tab Presence over `BroadcastChannel` with Heartbeat and Expiry**

> **Focus:** tracking live peers on a broadcast channel with heartbeats and TTL expiry (no reliable "leave" signal) · **Time box:** ~45 min
> **Format:** Small app · **Stack:** React 19 (`react@19.3.1`) + TypeScript + Vite 8

#### **Overview**
A collaborative editor shows "3 people here", a dashboard warns "this account is open in another tab". Tabs crash, freeze, get discarded by the browser, or lose power, so they cannot be trusted to say goodbye. Presence has to be built from heartbeats and expiry, with `close` as an optimisation, not as the source of truth.

---

### **What You'll Learn**

**Core concept:** presence as soft state: every peer is alive only while its heartbeat keeps refreshing a TTL, and a new tab learns about existing ones through a hello/reply handshake.

**By the end you should be able to:**
- implement a presence registry over `BroadcastChannel` with heartbeat and expiry
- explain why an explicit "bye" message is not enough
- keep a `getSnapshot` result referentially stable when nothing changed, as `useSyncExternalStore` requires
- choose a heartbeat interval versus TTL (and why TTL must be several heartbeats)

**Skills practised:** BroadcastChannel · heartbeats · TTL expiry · soft state · external store contract

**Prerequisites:** basic React, timers, `BroadcastChannel`.

**Where this shows up in practice:** "also open in another tab" warnings, Google Docs-style collaborator avatars, multi-tab leader election. Same idea with Socket.IO/Phoenix Presence, only the transport differs.

**Self-check (answer after solving):**
1. Why must TTL be larger than the heartbeat interval, and by how much?
2. A tab is frozen by the browser for 10 s, then resumes. What do the others see, and does it recover?
3. Why should `getSnapshot` return the same array reference when nothing changed?

---

### **Starter**
The project lives in [`tab-presence/`](./tab-presence): `cd tab-presence && npm install && npm run dev`, then open the URL in two or more tabs. The app and the `usePeers` hook are given; the inert `createPresence` in `src/presence.ts` only knows about its own tab.

```ts
export type Peer = { id: string; joinedAt: number; lastSeen: number };
export type PresenceOptions = { heartbeatMs: number; ttlMs: number; now?: () => number };
export type Presence = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly Peer[];
  close(): void;
};
export function createPresence(channelName: string, selfId: string, options: PresenceOptions): Presence;
```

---

### **Detailed Requirements**
- Implement `createPresence` on one `BroadcastChannel(channelName)`. Messages are `{ type: "hello" | "beat" | "bye", id, joinedAt }`.
- On creation, announce with `hello`. Every tab that receives a `hello` from someone else answers with a `beat`, so a newcomer discovers existing tabs immediately.
- Send a `beat` every `heartbeatMs`. Record `lastSeen = now()` for each received message; drop a peer once `now() - lastSeen > ttlMs`. Run the expiry sweep on the same timer.
- `bye` removes the peer at once; `close()` sends `bye`, clears the timer, closes the channel and is idempotent.
- `getSnapshot()` includes this tab, is sorted by `joinedAt` (ties by `id`), and returns the **same reference** until the set of peers or a `joinedAt` changes (a refreshed `lastSeen` alone must not notify).

### **Acceptance Criteria**
- Open 3 tabs: each shows "Open tabs: 3" within about a second of opening the last one.
- Close one tab normally: the other two drop to 2 immediately.
- Kill one tab's process (e.g. Chromium task manager "End process") or throttle it: the others drop to 2 after roughly `ttlMs` (3.5 s) without any "bye".
- A tab that was gone but resumes beating reappears in the others.
- React Strict Mode's mount/unmount/mount in dev doesn't leave duplicate or ghost entries.

---

### **Edge Cases & Performance Considerations**
- Own messages are not delivered to the sender's channel object, but a second `createPresence` with the same id in the same tab (Strict Mode) is: ignore messages carrying `selfId`.
- Don't notify subscribers on every beat, only when the visible set changes; otherwise the UI re-renders once per peer per second.
- Stretch: pause the heartbeat while the tab is hidden and see what that does to the TTL choice.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite (fake timers + injected clock) or a Playwright spec with several pages.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
