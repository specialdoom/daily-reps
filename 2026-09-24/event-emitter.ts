export type EventMap = Record<string, unknown>;

type Subscription = {
  unsubscribe: () => void;
};

type ListenerEntry = {
  active: boolean;
  handler: (payload: unknown) => void;
};

/**
 * Type-safe publish/subscribe utility.
 *
 * TEvents is the event contract: its keys are valid event names and its
 * values are the payload types associated with those names.
 */
export class EventEmitter<TEvents extends EventMap> {
  // Listener registrations are runtime data, separate from the compile-time
  // event map. Each event name has its own ordered collection of listeners.
  #listeners = new Map<keyof TEvents, ListenerEntry[]>();

  private addListener<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ): ListenerEntry {
    const entry: ListenerEntry = {
      active: true,
      // The public API provides the event-specific type. This cast is limited
      // to the runtime listener registry, where payload types are erased.
      handler: handler as (payload: unknown) => void,
    };

    const listeners = this.#listeners.get(event) ?? [];
    this.#listeners.set(event, [...listeners, entry]);

    return entry;
  }

  private removeListener<K extends keyof TEvents>(
    event: K,
    entry: ListenerEntry,
  ): void {
    // Marking the entry inactive makes removal during an active emission safe:
    // a snapshot can still contain the entry, but emit() will skip it.
    entry.active = false;

    const listeners = this.#listeners.get(event);
    if (!listeners) {
      return;
    }

    const remainingListeners = listeners.filter((listener) => listener !== entry);

    if (remainingListeners.length === 0) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.set(event, remainingListeners);
    }
  }

  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ): Subscription {
    const entry = this.addListener(event, handler);

    return {
      // Removing the same entry more than once is safe and has no effect.
      unsubscribe: () => this.removeListener(event, entry),
    };
  }

  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void,
  ): Subscription {
    let subscription: Subscription;

    const wrapper = (payload: TEvents[K]): void => {
      // Unsubscribe before invoking the user callback so re-entrant emits
      // cannot invoke this once-listener again.
      subscription.unsubscribe();
      handler(payload);
    };

    subscription = this.on(event, wrapper);
    return subscription;
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const listeners = this.#listeners.get(event);
    if (!listeners) {
      return;
    }

    // Use a snapshot so listeners may safely subscribe or unsubscribe while
    // the event is being dispatched without corrupting iteration order.
    for (const listener of [...listeners]) {
      if (!listener.active) {
        continue;
      }

      try {
        listener.handler(payload);
      } catch {
        // Isolate listener failures so one callback cannot prevent later
        // callbacks from receiving the same event.
      }
    }
  }
}
