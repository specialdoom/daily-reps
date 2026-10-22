import { useEffect, useState, useSyncExternalStore } from "react";
import type { createStore } from "./store";

type Store<T> = ReturnType<typeof createStore<T>>;

// TODO: this is the hook under review.

// REASON: the subscribe is never happening cause the uselayout effect is happening before the useEffect so the value is already set when the subscription in registered
export function useStore<T>(store: Store<T>): T {
  const correctValue = useSyncExternalStore(store.subscribe, store.get);

  return correctValue;
}
