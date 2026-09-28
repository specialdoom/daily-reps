import { Observable } from "rxjs";
import { debounceTime, tap } from "rxjs/operators";

type DebounceSignalOptions<T> = {
  initialValue: T;
  debounceMs: number;
  destroyRef?: { onDestroy: (callback: () => void) => void };
  onError?: (err: unknown) => void;
};

type SignalGetter<T> = (() => T) & {
  unsubscribe: () => void;
  subscribe: (calback: (value: T) => void) => () => void;
};

export function toDebounceSignal<T>(
  source$: Observable<T>,
  { initialValue, debounceMs, destroyRef, onError }: DebounceSignalOptions<T>,
): SignalGetter<T> {
  let signalValue = initialValue;
  let listeners: ((value: T) => void)[] = [];

  const subscription = source$
    .pipe(
      debounceTime(debounceMs),
      tap((value) => {
        if (value !== signalValue) {
          signalValue = value;
          listeners.forEach((listener) => {
            listener(value);
          });
        }
      }),
    )
    .subscribe({
      error: (error) => onError?.(error),
    });

  destroyRef?.onDestroy(unsubscribe);

  function unsubscribe() {
    subscription.unsubscribe();
  }

  function getter() {
    return signalValue;
  }

  function subscribe(callback: (value: T) => void) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  }

  getter.unsubscribe = unsubscribe;
  getter.subscribe = subscribe;

  return getter;
}
