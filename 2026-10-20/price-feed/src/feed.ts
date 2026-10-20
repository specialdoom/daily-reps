export type Tick = { symbol: string; price: number };

export type Unsubscribe = () => void;

/** Push-based source, as given by a WebSocket wrapper or an event emitter. */
export interface Feed {
  subscribe(onTick: (tick: Tick) => void): Unsubscribe;
}

/** In-memory feed that counts live listeners. */
export function createFakeFeed() {
  const listeners = new Set<(tick: Tick) => void>();
  const feed: Feed = {
    subscribe(onTick) {
      listeners.add(onTick);
      return () => {
        listeners.delete(onTick);
      };
    },
  };
  return {
    feed,
    emit(tick: Tick) {
      for (const listener of [...listeners]) listener(tick);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}
