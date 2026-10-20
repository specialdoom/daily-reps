import type { Feed, Tick } from "./feed.ts";

/** Turns a push-based feed into an async iterable of ticks for one symbol. */
export async function* watchPrice(feed: Feed, symbol: string): AsyncGenerator<number> {
  const queue: Tick[] = [];
  let wake: (() => void) | undefined;

  const unsubscribe = feed.subscribe((tick) => {
    if (tick.symbol !== symbol) return;
    queue.push(tick);
    wake?.();
  });

  while (true) {
    while (queue.length > 0) {
      yield queue.shift()!.price;
    }
    await new Promise<void>((resolve) => {
      wake = resolve;
    });
  }

  unsubscribe();
}
