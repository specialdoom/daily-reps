### **Daily Frontend Challenge: [Core Web APIs & Performance] The Infinite Feed That Stalls After One Page: `IntersectionObserver` Only Fires on Changes**

> **Focus:** driving infinite scroll with `IntersectionObserver` (transition-based callbacks, `rootMargin` prefetch, in-flight guard) · **Time box:** ~40 min
> **Format:** Inside an existing app · **Stack:** vanilla TypeScript (strict) + Vite 8 (`vite@8.3.5`)

#### **Overview**
Infinite scroll is usually built by observing a sentinel element at the end of the list. The trap: `IntersectionObserver` reports *changes* in intersection, not "is currently visible". If a freshly loaded page is too short to push the sentinel out of view, nothing changes, the callback never fires again, and the feed stalls with empty space below it. Production feeds also need to avoid duplicate requests while one is in flight, and to stop observing at the end.

---

### **What You'll Learn**

**Core concept:** `IntersectionObserver` fires on intersection *transitions* (plus once on `observe()`), so a loader must re-arm the observer after each append and guard against concurrent loads.

**By the end you should be able to:**
- explain why a callback is not called again while the sentinel stays visible
- re-arm an observer (`unobserve` + `observe`) to get a fresh initial notification
- prefetch before the user reaches the end with `rootMargin`
- prevent duplicate page loads with an in-flight guard and stop cleanly at the end of the data

**Skills practised:** IntersectionObserver · infinite scroll · async re-entrancy · DOM lifecycle

**Prerequisites:** `async`/`await`, basic DOM APIs.

**Where this shows up in practice:** social feeds, search results, log viewers, image galleries, and the "load more on scroll" hooks in libraries such as TanStack Query's `useInfiniteQuery`.

**Self-check (answer after solving):**
1. When exactly does an `IntersectionObserver` callback run? Why doesn't it run again after you append items below a still-visible sentinel?
2. What would happen with two fast callbacks and no in-flight guard?
3. What does `rootMargin: "0px 0px 300px 0px"` change, and what are the cost trade-offs of a big value?

---

### **Starter**
The project lives in `infinite-feed/`. Run it with `cd infinite-feed && npm install && npm run dev`.

- `src/api.ts` — fake `fetchPage(cursor)`: 50 items, 5 per page, 300 ms latency (don't change).
- `src/main.ts` — the page logic and a naive observer. Your work goes here.
- `index.html` — `#feed`, `#status` (`role="status"`) and `#sentinel` below the list.

```ts
const observer = new IntersectionObserver((entries) => {
  if (entries.some((e) => e.isIntersecting)) void loadMore();
});
observer.observe(sentinel);
```

Symptom: on a tall window the page shows 5 items, then stops with a large blank area. Scrolling in a short window works, but quick scrolling can request the same page twice (duplicate items).

---

### **Detailed Requirements**
- Keep loading until the sentinel is pushed out of the viewport, including on very tall windows (the feed must fill the screen on its own).
- Never run two `loadMore()` calls at once; never append the same page twice.
- Prefetch: start loading when the sentinel is within ~200px below the viewport (`rootMargin`).
- When `nextCursor` is `null`, disconnect the observer and show `end of feed`.
- If `fetchPage` rejects (try making it throw), show `error — retry` in the status, allow a retry, and don't wedge the in-flight guard.

### **Acceptance Criteria**
- Open the page with a 1200px-tall window: the feed fills past the bottom edge without scrolling.
- Scroll fast in a short window: the list shows `Item #1` … `Item #50` exactly once each, in order.
- After 10 pages, `end of feed` is shown and no further requests are made (check the Network/console).
- Items start loading before the sentinel is actually visible.

---

### **Edge Cases & Performance Considerations**
- Content removed or resized above the sentinel can change intersection without scrolling: don't rely on scroll events.
- Avoid a re-arm loop that spins forever when a page returns no items but a non-null cursor.
- Stretch: pause loading while `document.hidden`, and resume on `visibilitychange`.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
