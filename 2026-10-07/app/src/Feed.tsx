import { useEffect, useRef, useState } from "react";
import { fetchPage, type Post } from "./api";

// Keying by feedId gives every feed a fresh instance: state, refs, the abort
// controller and the observer all start over, so nothing of the old feed can
// render under the new id and no state has to be reset in an effect.
export function Feed({ feedId }: { feedId: string }) {
  return <FeedList key={feedId} />;
}

function FeedList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const cursorRef = useRef<number | null>(0);
  const loadingRef = useRef<boolean>(false);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLLIElement>(null);
  const [error, setError] = useState<string>("");
  const abortController = useRef<AbortController | null>(null);

  async function loadMore() {
    const signal = abortController.current?.signal;
    if (!signal || loadingRef.current || cursorRef.current === null) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const page = await fetchPage(cursorRef.current, signal);
      // A real fetch can still resolve after its abort; never apply that page.
      if (signal.aborted) return;
      setPosts((v) => [...v, ...page.items]);
      setError("");

      cursorRef.current = page.nextCursor;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;

      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // After a remount (StrictMode) a newer request may own the guard by now.
      if (abortController.current?.signal === signal) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    abortController.current = controller;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    if (sentinel.current) observer.observe(sentinel.current);

    return () => {
      observer.disconnect();
      controller.abort();
      abortController.current = null;
      loadingRef.current = false;
    };
    // loadMore only reads refs and setters, so the first render's copy stays valid.
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // Runs after the new posts are in the DOM, so this measures the updated layout.
    // The observer only reports changes, so a sentinel that stays visible needs this.
    if (el.getBoundingClientRect().top < window.innerHeight) loadMore();
  }, [posts]);

  return (
    <>
      {error && (
        <p role="alert">
          {error} <button onClick={loadMore}>Retry</button>
        </p>
      )}
      <ul aria-busy={loading}>
        {posts.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
        <li ref={sentinel} aria-hidden={true} />
        {loading && <li role="status">Loading…</li>}
      </ul>
    </>
  );
}
