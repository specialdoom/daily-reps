type Snapshot<T> = ReturnType<typeof $state.snapshot<T>>;

export type History = {
  commit(): void;
  undo(): void;
  redo(): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
};

/**
 * Undo/redo over a deep `$state` object, restoring entries into `state` in place.
 *
 * Entries are `$state.snapshot`s, so they hold plain data. Snapshotting copies
 * plain objects and arrays deeply, and for other values:
 * - `Date` is cloned and restores as a `Date` (a new instance).
 * - `Map` / `Set` are shallow-copied: their values are shared with the live
 *   state, and a `SvelteMap` / `SvelteSet` comes back as a plain, non-reactive one.
 * - Class instances use `toJSON()` if they have it, else are structured-cloned,
 *   so they restore as plain objects without their prototype (no methods/getters).
 * - Functions and other uncloneable values are kept by reference.
 * So keep history-tracked state to JSON-like data, or rehydrate after restore.
 */
export function createHistory<T extends object>(
  state: T,
  options?: { limit?: number }, // default to 50
): History {
  const limit = options?.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }

  let history: Snapshot<T>[] = $state.raw([$state.snapshot(state)]);
  let index = $state(0);
  let canUndo = $derived(index > 0);
  let canRedo = $derived(index < history.length - 1);

  function commit() {
    // Drop the redo branch, append, and keep only the newest `limit` entries.
    history = [...history.slice(0, index + 1), $state.snapshot(state)].slice(-limit);
    index = history.length - 1;
  }

  function restore(entry: Snapshot<T>) {
    // A fresh copy, so mutating the restored state can't reach the entry.
    // Unlike structuredClone, $state.snapshot doesn't throw on functions.
    const copy = $state.snapshot(entry) as unknown as T;

    // Object.assign alone would leave extra keys and never shrink an array.
    if (Array.isArray(state)) {
      state.splice(0, state.length, ...(copy as unknown[]));
      return;
    }
    for (const key of Object.keys(state)) {
      if (!(key in copy)) delete (state as Record<string, unknown>)[key];
    }
    Object.assign(state, copy);
  }

  function undo() {
    if (index === 0) return;

    restore(history[index - 1]);
    index--;
  }

  function redo() {
    if (index === history.length - 1) return;

    restore(history[index + 1]);
    index++;
  }

  return {
    commit,
    undo,
    redo,
    get canUndo() {
      return canUndo;
    },
    get canRedo() {
      return canRedo;
    },
  };
}
