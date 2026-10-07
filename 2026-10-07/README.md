### **Daily Frontend Challenge: [Core Web APIs & Performance] The Infinite Scroll That Fetches Forever**

> **Focus:** `IntersectionObserver` lifecycle and stale closures in effects · **Time box:** ~40 min
> **Format:** Debug / review · **Stack:** React 19 + TypeScript

#### **Overview**
A feed page uses an `IntersectionObserver` on a sentinel element to load the next page when the user scrolls near the bottom. In production, QA reports duplicated posts, bursts of requests on a fast scroll, and a growing number of observers in the performance profiler after navigating between feeds. The root cause is a single, small misuse of the observer lifecycle. Find it, explain it, and fix it.

---

### **Starter**

```tsx
import { useEffect, useRef, useState } from "react";

type Post = { id: number; title: string };
type Page = { items: Post[]; nextCursor: number | null };

// Given: resolves after ~300ms with 20 posts per page.
declare function fetchPage(cursor: number, signal?: AbortSignal): Promise<Page>;

export function Feed({ feedId }: { feedId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  async function loadMore() {
    if (loading || cursor === null) return;
    setLoading(true);
    const page = await fetchPage(cursor);
    setPosts([...posts, ...page.items]);
    setCursor(page.nextCursor);
    setLoading(false);
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    if (sentinel.current) observer.observe(sentinel.current);
  }, [posts]);

  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
      <div ref={sentinel} />
      {loading && <li>Loading…</li>}
    </ul>
  );
}
```

**Symptoms**
1. Scrolling quickly shows the same page twice; `posts` contains duplicate ids.
2. The network tab shows several requests for the same cursor, one per scroll tick near the bottom.
3. Switching `feedId` (or unmounting the page) leaves observers alive; they keep calling `loadMore` on a detached tree.
4. After switching `feedId`, posts from the old feed sometimes appear in the new one.

---

### **Detailed Requirements**
- Write a short root-cause analysis (a few sentences per symptom) that maps each symptom to a specific line or pattern in the starter.
- Fix the observer lifecycle: exactly one observer per mounted feed, disconnected on cleanup, not re-created on every `posts` change.
- Make `loadMore` safe against stale state: it must not read a stale `posts`, `cursor` or `loading` from an old render, and must not issue two requests for the same cursor.
- Cancel or ignore in-flight requests when `feedId` changes or the component unmounts, using `AbortSignal` (the given `fetchPage` accepts one).
- Keep the public API of `<Feed feedId />` unchanged. Do not add libraries.

### **Acceptance Criteria**
- Scrolling to the bottom quickly 10 times produces one request per cursor, and `posts` ids are unique and ordered.
- Changing `feedId` aborts the pending request, resets the list, and never shows items from the previous feed.
- In the profiler or via a spy on `IntersectionObserver.prototype.disconnect`, each mount creates one observer and each unmount disconnects it.
- No React warning about state updates after unmount.

---

### **Edge Cases & Performance Considerations**
- The sentinel may already be visible when the first page renders (short pages on a tall screen). The feed must keep loading until the viewport is filled, without a scroll event.
- `fetchPage` rejecting with an `AbortError` must not be treated as a real error or leave `loading` stuck on `true`.
- Stretch goal: use `rootMargin` to prefetch before the sentinel is actually visible, and explain why the callback must still be idempotent.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest + React Testing Library suite with a mocked `IntersectionObserver`, or a starter project.
- **(B)** Paste your root-cause analysis and fix for a review of correctness, edge cases, and performance.
