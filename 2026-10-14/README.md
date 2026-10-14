### **Daily Frontend Challenge: [Real-time] One Connection per Browser: Leader-Tab Election over `BroadcastChannel`**

> **Focus:** electing a single leader tab with heartbeats and fast failover · **Time box:** ~45 min
> **Format:** Real-time app · **Stack:** Preact 11 (`preact@11.0.1`) + `@preact/signals@2.11.3` + TypeScript + Vite 8

#### **Overview**
A user opens your dashboard in six tabs. If each tab opens its own WebSocket, you multiply server load and rate-limit hits by six. The standard fix is to let one "leader" tab own the connection while the others stay quiet, and to hand the job to another tab the moment the leader is closed or crashes. You'll build that election with nothing but `BroadcastChannel` and timers, and expose the result as signals.

---

### **What You'll Learn**

**Core concept:** leader election among peers that can only broadcast messages: claiming, heartbeats, timeouts and deterministic tie-breaking.

**By the end you should be able to:**
- Explain why "first tab wins" fails without heartbeats, and why a crashed tab can't announce its own death.
- Implement a heartbeat and timeout based failover that settles on exactly one leader.
- Break simultaneous-claim ties deterministically without a coordinator.
- Release leadership cleanly on `resign` so failover doesn't have to wait for a timeout.

**Skills practised:** BroadcastChannel · leader election · heartbeats and timeouts · Preact Signals

**Prerequisites:** timers, events, basic signals (`signal`, `effect`).

**Where this shows up in practice:** shared WebSocket/SSE connections in chat and dashboard apps, and `navigator.locks`-based variants. Libraries like `broadcast-channel` ship the same pattern.

**Self-check (answer after solving):**
1. Two tabs start at the same millisecond and both claim leadership. How does your design converge, and how long can two leaders coexist?
2. What happens to a leader tab that is throttled in the background for 10 seconds? Does your timeout cope?
3. Why is a `resign` message an optimisation and not a correctness requirement?

---

### **Why Preact Signals?**
Signals update only the DOM text that reads them, with no component re-render and no hook dependency arrays. That suits election state that changes from timers and channel events. See the [Preact Signals guide](https://preactjs.com/guide/v10/signals/).

---

### **Starter**
The project is in [`leader-tab/`](./leader-tab). Run it with:

```bash
cd leader-tab && npm install && npm run dev
```

Open the printed URL in several tabs. `src/election.ts` has the types, constants and an empty `startElection()`; `src/feed.ts` is a fake connection that opens only while `role.value === "leader"`; the UI shows the role. Right now every tab stays a follower.

---

### **Detailed Requirements**
Implement `startElection(): () => void` in `src/election.ts`, using the given `Msg` type, `tabId`, `HEARTBEAT_MS` and `LEADER_TIMEOUT_MS`, and keep the `role` and `leaderId` signals up to date.

- A tab that hears no heartbeat for `LEADER_TIMEOUT_MS` claims leadership. The first tab opened becomes leader promptly (within about one timeout).
- The leader broadcasts `{ type: "heartbeat" }` every `HEARTBEAT_MS`. Followers record the leader's id and the time of the last heartbeat.
- If the leader tab is closed, a single follower takes over within roughly `LEADER_TIMEOUT_MS`, even if the leader never sent anything on the way out.
- The returned stop function clears timers, and if the tab is leader, broadcasts `resign` so followers can take over without waiting for the timeout. Call it on `pagehide` too.
- No `any`; strict TypeScript.

### **Acceptance Criteria**
- Open 3 tabs: exactly one shows `Role: leader`, and the console shows `feed OPEN` in that tab only.
- Close the leader tab: within about 4 seconds exactly one other tab becomes leader.
- Close the leader tab via the stop function / `pagehide`: takeover happens in well under a second.
- Open a new tab while a leader exists: it stays a follower and shows the leader's id.

---

### **Edge Cases & Performance Considerations**
- **Simultaneous claims:** two tabs claim at the same time. Both must see the other's heartbeat and the loser must step down (for example, the lowest `tabId` wins).
- **Background throttling:** browsers throttle timers in hidden tabs, so a healthy leader may heartbeat late. Choose behaviour that avoids flapping.
- **Dead leader and old messages:** ignore heartbeats from a tab you already saw resign.

*Stretch goal:* use `navigator.locks.request` as the election mechanism and compare its failure behaviour with the heartbeat approach.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite (multi-page, closing the leader) or a Vitest suite with a fake channel.
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
