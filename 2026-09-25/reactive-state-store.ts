// ============================================================================
// Types Definition
// ============================================================================

/**
 * Represents a listener function triggered when a subscribed slice of state changes.
 * @template TSlice - The inferrable type returned by the selector function.
 */
type Listener<TSlice> = (value: TSlice) => void;

/**
 * Defines valid update shapes passed to `setState`.
 * Supports both partial state objects and functional updaters receiving prior state.
 * @template TState - The root state object shape.
 */
type StateUpdater<TState> =
  | Partial<TState>
  | ((state: TState) => Partial<TState>);

/**
 * Public interface for the reactive store instance.
 * @template TState - Root state shape constrained to an object.
 */
export type Store<TState, TSlice> = {
  /** Returns the current state snapshot. */
  getState(): TState;

  /** Updates state partially or functionally and triggers relevant subscribers. */
  setState(updater: StateUpdater<TState>): void;

  /**
   * Subscribes a listener to a specific projection/slice of the state.
   * @template TSlice - Return type inferred automatically from the selector return.
   */
  subscribe(
    selector: (state: TState) => TSlice,
    listener: Listener<TSlice>,
  ): { unsubscribe: () => void };
};

/**
 * Internal data structure used to track subscriber registrations.
 * Stored internally inside a Set to allow O(1) addition and removal.
 */
type InternalSubscriber<TState, TSlice> = {
  /** Selector function evaluated on state mutation to derive the slice. */
  selector: (state: TState) => TSlice;

  /** Callback triggered only when `currentSlice` changes. */
  listener: Listener<TSlice>;

  /** Remembers the last evaluated slice value for strict equality verification. */
  currentSlice: TSlice;
};

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Factory creating a strongly-typed reactive state store.
 * @template TState - Inferred root state object.
 * @param initialState - Base state used for initialization.
 */
export function createStore<TState, TSlice>(
  initialState: TState,
): Store<TState, TSlice> {
  // 1. Encapsulate mutable state and subscribers within closure
  let state = initialState;

  // Use a Set for store-wide subscribers. This avoids key-indexing bugs
  // and allows subscribers to target computed paths or primitive derivations.
  const subscribers = new Set<InternalSubscriber<TState, TSlice>>();

  /**
   * Returns a reference to the latest state snapshot.
   */
  function getState(): TState {
    return state;
  }

  /**
   * Mutates store state and evaluates selector changes.
   */
  function setState(updater: StateUpdater<TState>): void {
    // Determine partial mutation shape depending on updater variant
    const nextPartial =
      typeof updater === "function" ? updater(state) : updater;

    // Create a new reference for the updated state object
    const nextState = { ...state, ...nextPartial };

    // --- NO-OP GUARD ---
    // Perform a shallow check across keys in `nextPartial`.
    // If no values actually changed, short-circuit to save re-evaluations.
    const hasChanges = (Object.keys(nextPartial) as (keyof TState)[]).some(
      (key) => !Object.is(state[key], nextState[key]),
    );

    if (!hasChanges) return;

    // CRITICAL: Mutate internal state reference BEFORE triggering listeners.
    // This ensures any `getState()` call inside a subscriber receives fresh data.
    state = nextState;

    // --- RE-EVALUATE SUBSCRIBERS ---
    // Iterate subscribers and re-calculate their selectors against the new state
    subscribers.forEach((sub) => {
      const nextSlice = sub.selector(state);

      // Compare previous slice reference with new slice reference.
      // `Object.is` correctly handles `NaN === NaN` and `-0 !== +0`.
      if (!Object.is(sub.currentSlice, nextSlice)) {
        // Update cached slice prior to executing listener (prevents re-entry bugs)
        sub.currentSlice = nextSlice;

        // Execute listener with updated slice payload
        sub.listener(nextSlice);
      }
    });
  }

  /**
   * Registers a selector subscription targeting a slice of the root state.
   */
  function subscribe(
    selector: (state: TState) => TSlice,
    listener: Listener<TSlice>,
  ): { unsubscribe: () => void } {
    // Evaluate initial slice immediately upon subscription to seed the cache
    const subscriber: InternalSubscriber<TState, TSlice> = {
      selector,
      listener,
      currentSlice: selector(state),
    };

    // Store internal registration
    subscribers.add(subscriber);

    // Return teardown contract
    return {
      unsubscribe: () => {
        // Remove subscriber instance to prevent memory leaks
        subscribers.delete(subscriber);
      },
    };
  }

  return {
    getState,
    setState,
    subscribe,
  };
}

// ============================================================================
// Derived State Helper
// ============================================================================

/**
 * Creates a reactive derived value container that updates automatically
 * whenever the selected store dependency mutates.
 *
 * @template TState - Root state object type of the source store.
 * @template TSlice - The output type produced by the selector derivation.
 */
export function createComputed<TState, TSlice>(
  store: Store<TState, TSlice>,
  selector: (state: TState) => TSlice,
) {
  // Initialize local memory cache with current computed state
  let cachedValue = selector(store.getState());

  // Subscribe directly to the store using the same selector.
  // Whenever the selector output updates, keep the local cache synchronized.
  store.subscribe(selector, (newValue) => {
    cachedValue = newValue;
  });

  return {
    /**
     * Getter exposing the pre-calculated value without re-running
     * complex derivation logic on every read.
     */
    getValue(): TSlice {
      return cachedValue;
    },
  };
}
