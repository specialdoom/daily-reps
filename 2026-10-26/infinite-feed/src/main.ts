import { fetchPage } from "./api";

const feed = document.querySelector<HTMLUListElement>("#feed")!;
const status = document.querySelector<HTMLElement>("#status")!;
const sentinel = document.querySelector<HTMLElement>("#sentinel")!;

let cursor: number | null = 0;

async function loadMore(): Promise<void> {
  if (cursor === null) return;
  status.textContent = "loading…";
  const page = await fetchPage(cursor);
  for (const item of page.items) {
    const li = document.createElement("li");
    li.textContent = item.title;
    feed.append(li);
  }
  cursor = page.nextCursor;
  status.textContent = cursor === null ? "end of feed" : "";
}

// TODO: make the feed load continuously as the sentinel approaches the viewport.
const observer = new IntersectionObserver((entries) => {
  if (entries.some((e) => e.isIntersecting)) void loadMore();
});
observer.observe(sentinel);
