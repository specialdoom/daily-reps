### **Daily Frontend Challenge: [Framework Mechanics & State Primitives] Fresh Values, Stable Connection: `useEffectEvent` in a Chat Room**

> **Focus:** reading the latest props/state inside an effect without re-subscribing · **Time box:** ~30 min
> **Format:** Inside an existing app · **Stack:** React 19 (`react@19.3.1`, `useEffectEvent`) + TypeScript 5.9 + Vite 8 (`vite@8.3.8`)

#### **Overview**
A chat panel subscribes to a room and shows a toast per incoming message. Users can mute toasts. The subscription must follow `roomId` only, yet the message handler must always see the *current* `muted` value. Both obvious fixes to the dependency array fail in production: omit `muted` and it goes stale, include it and every toggle drops and re-opens the connection.

---

### **What You'll Learn**

**Core concept:** An effect should re-run only when the things it *synchronizes with* change. Values it merely *reads* belong in an Effect Event, which always sees the latest render but is not a dependency.

**By the end you should be able to:**
- Explain why the handler in the starter closes over a stale `muted`.
- Explain why adding `muted` to the dependency array is the wrong fix.
- Implement the fix with `useEffectEvent` and verify it by counting connects.
- Choose which values are reactive (dependencies) and which are only read (Effect Event).

**Skills practised:** stale closures · effect dependencies · `useEffectEvent` · subscriptions

**Prerequisites:** `useState`, `useEffect` with cleanup, the dependency array.

**Where this shows up in practice:** WebSocket/SSE subscriptions, analytics loggers, timers that read current settings. Vue's `watchEffect` with `toRaw`/refs and Solid's `untrack` solve the same problem.

**Self-check (answer after solving):**
1. Why can't an Effect Event be listed in the dependency array, or called from another component or a child's callback?
2. What would break if you moved `setMessages` into the Effect Event too? Is that needed?
3. When *should* `muted` stay a normal dependency?

---

### **Starter**
Project: [`room-subscription/`](./room-subscription). Run `cd room-subscription && npm install && npm run dev`.

`src/fake-room.ts` is given (a timer-based fake connection plus `stats` counters). The task is one change in `Room` in `src/App.tsx`:

```tsx
useEffect(() => {
  setMessages([]);
  const connection = connectToRoom(roomId, (message) => {
    setMessages((prev) => [...prev, message]);
    if (!muted) showToast(message.text);
  });
  return () => connection.disconnect();
}, [roomId]);
```

**Symptom:** tick "Mute toasts" and `[toast]` still logs to the console (the handler remembers `muted = false`).

---

### **Detailed Requirements**
- Toasts must respect the **current** `muted` value at the moment a message arrives.
- Toggling `muted` must **not** disconnect or reconnect: `Connects`/`Disconnects` stay unchanged (click "Refresh counts").
- Changing `roomId` must still disconnect the old room, connect the new one and clear the messages.
- Use `useEffectEvent` (stable since React 19.2). Do not silence the lint rule or use a ref workaround. Strict TypeScript, no `any`.

### **Acceptance Criteria**
- Mute, then wait for a message: no `[toast]` in the console. Unmute: toasts resume on the next message.
- Toggle mute five times: Connects stays at 1, Disconnects at 0.
- Switch room: Connects 2, Disconnects 1, and the list shows only the new room's messages.

---

### **Edge Cases & Performance Considerations**
- A message arrives in the same tick as the toggle: which value should it see?
- Room switching must not leak timers: `Disconnects` always equals `Connects - 1`.
- Stretch: add a `notificationSound` prop that is also only read in the handler. What changes in your code?

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
