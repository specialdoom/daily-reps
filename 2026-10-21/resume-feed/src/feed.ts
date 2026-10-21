export type Tick = { id: number; symbol: string; price: number };

export type Status = "connecting" | "open" | "reconnecting" | "closed";

export type FeedOptions = {
  onTick: (tick: Tick) => void;
  onStatus: (status: Status) => void;
  /** Called when the server says the cursor is too old and history was lost. */
  onGap: () => void;
};

/**
 * Connects to `url` with EventSource and keeps the stream alive.
 * Returns a function that closes it for good.
 */
export function connectFeed(url: string, opts: FeedOptions): () => void {
  // TODO: reconnect with backoff, resume from the last id, drop duplicates.
  void url;
  void opts;
  throw new Error("TODO");
}
