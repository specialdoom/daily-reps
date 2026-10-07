import { useEffect, useRef, useState } from "react";

type Post = { id: number; title: string };
type Page = { items: Post[]; nextCursor: number | null };

function fetchPage(cursor: number, signal?: AbortSignal) {
  
}

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
