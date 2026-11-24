### **Daily Frontend Challenge: [Architecture & SSR] Hydration Failed: Four Ways to Render Differently on the Server and the Client**

> **Focus:** a hydration mismatch is a non-deterministic first render (server HTML ≠ first client render), and each source needs a different fix · **Time box:** ~40 min
> **Format:** Debug / review · **Stack:** Next.js 16 App Router (`next@16.4.6`) + React 19.3.1 + TypeScript 5.9

#### **Overview**
A "Your order" page works fine in development until someone opens it from another timezone: the console shows "Hydration failed because the server rendered text didn't match the client", the tree is thrown away and rebuilt on the client, and the layout flickers. One small client component contains four different causes. Find them, explain each, and fix it without hiding the error.

---

### **What You'll Learn**

**Core concept:** hydration reuses server HTML only if the client's *first* render produces the same output; anything that depends on the clock, the locale/timezone, randomness or browser-only APIs must either be made deterministic or deferred until after hydration.

**By the end you should be able to:**
- explain what React compares during hydration and what it does on a mismatch
- classify a mismatch source as time, locale/timezone, randomness or browser-only state
- fix each source with the right tool (`useId`, `useSyncExternalStore`, `useEffect`, passing data from the server, a fixed `timeZone`)
- justify when `suppressHydrationWarning` is acceptable, and when it only hides a bug

**Skills practised:** SSR/hydration · Next.js App Router · client vs server components · `useId` · `useSyncExternalStore` · `Intl`

**Prerequisites:** React hooks; knowing that Next.js renders Client Components on the server first.

**Where this shows up in practice:** relative timestamps, dark-mode or density preferences, A/B variants, generated form ids. Same problem in Nuxt, SvelteKit and Angular SSR.

**Self-check (answer after solving):**
1. Why does `typeof window !== "undefined"` not solve the problem, and often causes it?
2. What does React do when hydration fails, and what does that cost the user?
3. Which of the four sources could you fix on the server alone, and which need the client to render twice?

---

### **Why Next.js App Router?**
It renders React Server Components and also pre-renders Client Components to HTML, so "this runs in the browser only" is no longer true for the first pass, which is the root of most hydration bugs. Docs: https://nextjs.org/docs/app

---

### **Starter**
Project: `2026-11-24/hydration-mismatch/`. Run: `cd hydration-mismatch && npm install && npm run dev`, then open http://localhost:3000. To reproduce, set your browser's timezone away from the server's (e.g. Chrome DevTools → Sensors → Location/timezone) and set `localStorage.density = "compact"`, then reload.

`app/page.tsx` (Server Component) passes a `placedAt` ISO string. `app/components/OrderStatus.tsx`:

```tsx
"use client";
import { useState } from "react";

export function OrderStatus({ placedAt }: { placedAt: string }) {
  const compact = typeof window !== "undefined" && localStorage.getItem("density") === "compact";
  const placedLabel = new Date(placedAt).toLocaleString();
  const minutesAgo = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
  const inputId = `note-${Math.random().toString(36).slice(2, 8)}`;
  const [note, setNote] = useState("");
  // ... renders padding, "Placed: {placedLabel}", "{minutesAgo} minutes ago", label + input
}
```

---

### **Detailed Requirements**
- Write a short list (in a `NOTES.md` or comments) naming each of the four mismatch sources and what differs between server and client.
- Fix the **id** so label and input stay linked and it is stable across server and client.
- Fix the **density preference** so the first client render matches the server HTML, and the saved preference is applied afterwards (a brief switch is acceptable; keep `localStorage` out of render).
- Fix the **placed date** so every viewer sees consistent output on first render. Choose and justify one: format on the server with a fixed `timeZone`/`locale`, or render a neutral value first and localise after mount.
- Fix **"minutes ago"** so it does not depend on `Date.now()` during the first render, and keeps updating after hydration.
- Do not use `suppressHydrationWarning` on `<section>` or any element containing more than a single text node.

### **Acceptance Criteria**
- With the browser in a different timezone and `density=compact`, the dev console shows no hydration error after reload.
- Clicking the label focuses the input, before and after hydration.
- The preference and the localised date appear correctly after hydration; the "minutes ago" value ticks forward.
- `npm run build` still succeeds.

---

### **Edge Cases & Performance Considerations**
- Fixing one source still leaves the warning if another remains; verify them one at a time.
- `useEffect` + `setState` fixes correctness but causes a visible flash: consider what the server HTML should show instead (a placeholder of the same size) to avoid layout shift.
- Two timezones can land on different dates for the same instant, so test one far from UTC.

**Stretch:** replace the `useEffect` preference read with `useSyncExternalStore` and a `getServerSnapshot`.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite (with `timezoneId` set) that fails on any hydration console error.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
