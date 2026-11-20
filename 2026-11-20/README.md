### **Daily Frontend Challenge: [Core Web APIs & Performance] The Sentinel That Fires Once: Infinite Scroll with `IntersectionObserver`**

> **Focus:** loading the next page from an `IntersectionObserver` sentinel, and why the observer only fires on *transitions* (so a sentinel that stays visible needs a re-check) · **Time box:** ~40 min
> **Format:** Small app · **Stack:** Svelte 5 (`svelte@5.58.0`, runes, `{@attach}`) + TypeScript + Vite 8

#### **Overview**
A feed loads 8 posts at a time. Scroll listeners are expensive and janky, so you will use an `IntersectionObserver` on a sentinel element below the list. The catch: the observer reports only when intersection *changes*, so if a page is short and the sentinel is still on screen after loading, nothing fires again and the feed stalls.

---

### **What You'll Learn**

**Core concept:** `IntersectionObserver` callbacks fire on visibility transitions (plus once on `observe()`), not continuously; correct infinite scroll must handle "still visible after load" and in-flight requests.

**By the end you should be able to:**
- implement a reusable Svelte 5 attachment that observes an element and disconnects on teardown
- explain why a visible sentinel does not re-trigger, and implement a fix
- prevent duplicate page fetches while a request is in flight
- use `rootMargin` to prefetch before the sentinel is actually on screen

**Skills practised:** IntersectionObserver · async guards · Svelte 5 runes · `{@attach}` · cleanup

**Prerequisites:** basic Svelte or any component framework; promises/async.

**Where this shows up in practice:** social feeds, search results, image galleries. In React this is a `useEffect` + ref; in Vue a directive or composable.

**Self-check (answer after solving):**
1. When exactly does an `IntersectionObserver` callback run? What happens if the sentinel is visible both before and after the DOM grows?
2. Why is a `loading` flag in the handler necessary even though the observer is "event driven"?
3. What does `rootMargin: "0px 0px 300px 0px"` change, and what's the cost?

---

### **Why Svelte 5 attachments?**
`{@attach fn}` (Svelte 5.29+) runs a function when an element mounts and runs the cleanup it returns on teardown, re-running if reactive state read inside changes. It's the successor to actions. Docs: https://svelte.dev/docs/svelte/@attach

---

### **Starter**
Project: `2026-11-20/infinite-feed/`. Run: `cd infinite-feed && npm install && npm run dev`.

`src/api.ts` provides `fetchPage(cursor)` (400 ms latency, 8 posts per page, 40 total, `nextCursor: null` at the end). `src/App.svelte` has a working `loadMore` (without guards) and a "Load more" button. Currently the feed only loads by clicking.

---

### **Detailed Requirements**
- Create `src/inView.ts` exporting `inView(onEnter: () => void, options?: IntersectionObserverInit): Attachment<HTMLElement>` (type from `svelte/attachments`) that observes the element and calls `onEnter` when it is intersecting; it must `disconnect()` on cleanup.
- Render a sentinel element after the list using `{@attach inView(loadMore, { rootMargin: "0px 0px 300px 0px" })}`; remove the button (or keep it only as a fallback when `IntersectionObserver` is missing).
- `loadMore` must ignore calls while a request is in flight or when `cursor === null`.
- After each page loads, if the sentinel is still within the viewport (tall window, short page), the next page must load automatically, without any scrolling.
- Handle fetch errors: show a "Retry" button and don't loop endlessly.

### **Acceptance Criteria**
- On a tall viewport (e.g. 1400px) the first pages load automatically until the content overflows.
- On a short viewport, scrolling to the bottom loads one page per reach; never two concurrent requests (check the network/console).
- After post #40, "You're all caught up." shows, and no more fetches happen.
- Unmounting the component leaves no active observer.

---

### **Edge Cases & Performance Considerations**
- Sentinel stays visible after a load: the observer won't fire again. Re-observe (`unobserve`/`observe`) or re-evaluate after each load.
- Fast scrolling or a bursty callback can call `onEnter` twice before `loading` flips.
- No scroll listeners and no polling.

**Stretch:** make the observer's `root` a scrollable container element instead of the viewport.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
