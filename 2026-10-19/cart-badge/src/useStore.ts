import { useEffect, useState } from "react";
import type { createStore } from "./store";

type Store<T> = ReturnType<typeof createStore<T>>;

// TODO: this is the hook under review.
export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState(store.get());

  useEffect(() => {
    return store.subscribe(() => setValue(store.get()));
  }, [store]);

  return value;
}
