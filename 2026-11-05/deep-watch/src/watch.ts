export type Path = readonly (string | symbol)[];

/** Called after a property was set or deleted somewhere inside the watched tree. */
export type OnChange = (path: Path) => void;

/**
 * Returns a deep proxy of `target` that calls `onChange(path)` after every
 * successful `set` or `deleteProperty`, however deeply nested.
 */
export function watch<T extends object>(target: T, onChange: OnChange): T {
  // TODO
  throw new Error("TODO");
}
