export type Item = { id: number; title: string };
export type Page = { items: Item[]; nextCursor: number | null };

const PAGE_SIZE = 5;
const TOTAL = 50;

/** Fake paginated API: 50 items, 5 per page, ~300 ms latency. */
export function fetchPage(cursor: number): Promise<Page> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const items = Array.from({ length: Math.min(PAGE_SIZE, TOTAL - cursor) }, (_, i) => ({
        id: cursor + i + 1,
        title: `Item #${cursor + i + 1}`,
      }));
      const next = cursor + PAGE_SIZE;
      resolve({ items, nextCursor: next < TOTAL ? next : null });
    }, 300);
  });
}
