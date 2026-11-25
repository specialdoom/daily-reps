export class KeyedMutex {
  /**
   * Runs `fn` once every earlier call with the same `key` has settled.
   * Calls with different keys must not wait for each other.
   * Resolves or rejects with whatever `fn` does.
   */
  run<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
    // TODO
    throw new Error("TODO");
  }

  /** True while a call for `key` is running or queued. */
  isLocked(key: string): boolean {
    // TODO
    throw new Error("TODO");
  }
}
