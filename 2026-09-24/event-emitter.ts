export type EventMap = Record<string, any>;

class EventEmitter<TEvents extends EventMap> {
  #listeners = new Map<string, any[]>();

  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ) {
    const listeners = this.#listeners.get(event.toString()) ?? [];

    const newListeners = [...listeners, handler];

    this.#listeners.set(event.toString(), newListeners);

    return {
      unsubscribe: () => {
        const filteredListeners = listeners.filter((x) => x !== handler);

        console.log(filteredListeners);

        this.#listeners.set(event.toString(), filteredListeners);
      },
    };
  }

  once(
    event: keyof TEvents,
    handler: (payload: TEvents[keyof TEvents]) => void,
  ) {
    const listener = this.on(event, handler);

    return {
      unsubscribe: listener.unsubscribe,
    };
  }

  emit<K extends keyof TEvents>(event: K, payload: any) {
    const handlers = this.#listeners.get(event.toString());

    if (!handlers) return;

    handlers.forEach((handler) => {
      handler(payload);
    });
  }
}
