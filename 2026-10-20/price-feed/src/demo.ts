import { createFakeFeed } from "./feed.ts";
import { watchPrice } from "./prices.ts";

const fake = createFakeFeed();

async function firstAbove(limit: number): Promise<number> {
  for await (const price of watchPrice(fake.feed, "ACME")) {
    if (price > limit) return price;
  }
  throw new Error("unreachable");
}

const pending = firstAbove(100);
fake.emit({ symbol: "ACME", price: 98 });
fake.emit({ symbol: "ACME", price: 103 });
console.log("first price above 100:", await pending);
console.log("listeners still subscribed:", fake.listenerCount);
