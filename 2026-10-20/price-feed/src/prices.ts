import type { Feed, Tick } from "./feed.ts";

/** Turns a push-based feed into an async iterable of ticks for one symbol. */
export function watchPrice(feed: Feed, symbol: string): AsyncGenerator<number> {
  let wake: (() => void) | undefined;
  let stopped = false;
  const gen = (async function* () {
    const queue: Tick[] = [];

    const unsubscribe = feed.subscribe((tick) => {
      if (tick.symbol !== symbol) return;
      queue.push(tick);
      wake?.();
    });

    try {
      while (!stopped) {
        while (queue.length > 0) {
          yield queue.shift()!.price;
        }
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }
    } finally {
      unsubscribe();
    }
  })();

  const genReturn = gen.return;

  gen.return = async function (value) {
    stopped = true;
    wake?.();

    return genReturn.call(gen, value);
  };

  return gen;
}
