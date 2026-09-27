export function createDebouncedValue<T>() {
  let timer: number | undefined;
  let lastValue: T;

  if (timer !== undefined) clearTimeout(timer);

  return function useDebounceValue(value: T, ms = 300) {
    if (timer !== undefined) clearTimeout(timer);

    return new Promise((resolve) => {
      if (value === lastValue) {
        resolve(value);

        return;
      }

      timer = setTimeout(() => {
        lastValue = value;
        resolve(value);
      }, ms);
    });
  };
}

