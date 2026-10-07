import { faker } from "@faker-js/faker";

// Mock backend: the README's "given" fetchPage. In its own module so tests can make it fail.
export type Post = { id: number; title: string };
export type Page = { items: Post[]; nextCursor: number | null };

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

export function fetchPage(cursor: number, signal?: AbortSignal): Promise<Page> {
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
