export type EventMap = Record<string, any>;

class EventEmitter<TEvents extends EventMap> {
  #listeners = new Map<string, any[]>();

  private removeListener<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ) {
    const filteredListeners = this.#listeners
      .get(event.toString())
      ?.filter((x) => x !== handler);
    this.#listeners.set(event.toString(), filteredListeners ?? []);
  }

  private addNewListener<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ) {
    const newListeners = [
      ...(this.#listeners.get(event.toString()) ?? []),
      handler,
    ];

    this.#listeners.set(event.toString(), newListeners);
  }

  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ) {
    this.addNewListener(event, handler);

    return {
      unsubscribe: () => {
        this.removeListener(event, handler);
      },
    };
  }

  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ) {
    const wrapperHandler = (payload: any) => {
      handler(payload);

      this.removeListener(event, wrapperHandler);
    };

    this.addNewListener(event, wrapperHandler);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]) {
    this.#listeners.get(event.toString())?.forEach((handler) => {
      handler(payload);
    });
  }
}
