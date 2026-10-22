import { useRef, useSyncExternalStore } from "react";
import type { createStore } from "./store";

type Store<T> = ReturnType<typeof createStore<T>>;

// REASON: the uselayout effect is happening before the useEffect so the value is already set when the subscription in registered
export function useStore<T>(store: Store<T>): T {
  const correctValue = useSyncExternalStore(store.subscribe, store.get);

  return correctValue;
}

export function useStoreSelector<T, S>(
  store: Store<T>,
  select: (state: T) => S,
): S {
  const lastState = useRef(store.get());
  const lastSelected = useRef(select(store.get()));
  const lastSelect = useRef(select);

  const snapshot = useSyncExternalStore(store.subscribe, () => {
    if (store.get() === lastState.current && lastSelect.current === select)
      return lastSelected.current;

    lastSelected.current = select(store.get());
    lastState.current = store.get();
    lastSelect.current = select;

    return lastSelected.current;
  });

  return snapshot;
}
