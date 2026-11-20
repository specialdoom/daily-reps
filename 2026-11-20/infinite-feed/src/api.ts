export type Post = { id: number; title: string };
export type Page = { items: Post[]; nextCursor: number | null };

const PAGE_SIZE = 8;
const TOTAL = 40;

/** Mock API: ~400 ms latency, 8 posts per page, 40 posts in total. */
export async function fetchPage(cursor: number): Promise<Page> {
  await new Promise((r) => setTimeout(r, 400));
  const items = Array.from({ length: Math.min(PAGE_SIZE, TOTAL - cursor) }, (_, i) => ({
    id: cursor + i + 1,
    title: `Post #${cursor + i + 1}`,
  }));
  const next = cursor + PAGE_SIZE;
  return { items, nextCursor: next < TOTAL ? next : null };
}
