import { useEffect, useRef, useState } from "react";
import { faker } from "@faker-js/faker";

type Post = { id: number; title: string };
type Page = { items: Post[]; nextCursor: number | null };

const LATENCY_MS = 300;
const PAGE_SIZE = 20;
const PAGE_COUNT = 5;

function makeItems(cursor: number) {
  faker.seed(cursor + 1);
  return faker.helpers.multiple(
    (_v, index) => ({
      id: cursor * PAGE_SIZE + index,
      title: faker.lorem.sentence({ min: 4, max: 8 }),
    }),
    { count: PAGE_SIZE },
  );
}

function fetchPage(cursor: number, signal?: AbortSignal): Promise<Page> {
  if (signal?.aborted)
    return Promise.reject(new DOMException("Aborted", "AbortError"));

  return new Promise((resolve, reject) => {
    const timerId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve({
        items: makeItems(cursor),
        nextCursor: cursor + 1 < PAGE_COUNT ? cursor + 1 : null,
      });
    }, LATENCY_MS);

    const onAbort = () => {
      clearTimeout(timerId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function Feed({ feedId }: { feedId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const cursorRef = useRef<number | null>(0);
  const loadingRef = useRef<boolean>(false);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLLIElement>(null);
  const [error, setError] = useState<string>("");
  const abortController = useRef(new AbortController());

  async function loadMore() {
    if (loadingRef.current || cursorRef.current === null) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const page = await fetchPage(
        cursorRef.current,
        abortController.current.signal,
      );
      setPosts((v) => [...v, ...page.items]);

      cursorRef.current = page.nextCursor;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;

      setError((e as Error).message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    if (sentinel.current) observer.observe(sentinel.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortController.current = controller;
    setPosts([]);
    cursorRef.current = 0;
    setError("");

    return () => controller.abort();
  }, [feedId]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // Runs after the new posts are in the DOM, so this measures the updated layout.
    if (el.getBoundingClientRect().top < window.innerHeight) loadMore();
  }, [posts]);

  return (
    <>
      {error || ""}
      <ul>
        {posts.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
        <li ref={sentinel} aria-hidden={true} />
        {loading && <li>Loading…</li>}
      </ul>
    </>
  );
}
