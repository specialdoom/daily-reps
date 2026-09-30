type Store<TState> = {
  getState(): TState;
  setState(updater: StateUpdater<TState>): void;
  subscribe(
    selector: (state: TState) => Partial<TState>,
    listener: Subscriber<TState>,
  ): {
    unsubscribe: () => void;
  };
};

type Subscriber<TState> = (value: TState[keyof TState]) => void;

type StateUpdater<TState> =
  | Partial<TState>
  | ((state: TState) => Partial<TState>);

export function createStore<TState>(initialState: TState): Store<TState> {
  let state = initialState;
  const subscribers = new Map<keyof TState, Subscriber<TState>[]>();

  function getState(): TState {
    return state;
  }

  function setState(updater: StateUpdater<TState>) {
    notifySubscribers(updater);

    if (updater instanceof Function) {
      state = { ...state, ...updater(state) };
    } else {
      state = { ...state, ...updater };
    }
  }

  function subscribe(
    selector: (state: TState) => Partial<TState>,
    listener: Subscriber<TState>,
  ) {
    const newSubscribers = Object.keys(selector(state)) as (keyof TState)[];

    newSubscribers.forEach((subscriberKey) => {
      const oldListeners = subscribers.get(subscriberKey) ?? [];
      subscribers.set(subscriberKey, [...oldListeners, listener]);
    });

    return {
      unsubscribe: () => {
        newSubscribers.forEach((subscriberKey) => {
          const oldListeners = subscribers.get(subscriberKey) ?? [];
          subscribers.set(
            subscriberKey,
            oldListeners.filter((l) => l !== listener),
          );
        });
      },
    };
  }

  function notifySubscribers(updater: StateUpdater<TState>) {
    const newState = updater instanceof Function ? updater(state) : updater;
    const subscribersToNotify = Object.keys(newState) as (keyof TState)[];

    if (subscribersToNotify.length === 0) {
      return;
    }

    subscribersToNotify.forEach((selector) => {
      const selectorSubscribers = subscribers.get(selector);

      if (!selectorSubscribers) {
        return;
      }

      if (state[selector] !== newState[selector]) {
        selectorSubscribers.forEach((subscriber) =>
          subscriber(newState[selector]),
        );
      }
    });
  }

  return {
    getState,
    setState,
    subscribe,
  };
}

export function createComputed(store, selector) {
  return {
    getValue() {
      return selector(store.getState());
    },
  };
}
