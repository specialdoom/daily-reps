### **Daily Frontend Challenge: RxJS & Signals Interop – Custom Debounced State Sync**

#### **Overview**

In modern hybrid applications (e.g., Angular or Svelte 5 / React with RxJS), developers frequently bridge reactive streams (RxJS `Observable`s) with fine-grained reactivity primitives (Signals/Runes).

Your task is to build a type-safe interop utility function `toDebouncedSignal` that converts an RxJS `Observable` stream into a reactive Signal getter, with built-in debouncing, initial fallback values, and cleanup handling to prevent memory leaks during component unmounting.

---

### **Detailed Requirements**

1. **Signature & Behavior:**

- `toDebouncedSignal(source$: Observable, options: DebouncedSignalOptions): SignalGetter`
- `options` must accept:
- `initialValue: T` (used before any value emits from the stream).
- `debounceMs: number` (time in milliseconds to debounce emissions).
- `destroyRef?` or cleanup callback parameter to unsubscribe from `source$` when the host context is destroyed.

2. **Core Mechanics:**

- On initialization, the utility subscribes to `source$`.
- Incoming emissions must be debounced by `debounceMs` before updating the underlying signal value.
- Reading the returned `SignalGetter` function must return the current signal value synchronously.
- Guarantee that unsubscribing from the source stream cancels any pending debounced emissions immediately to avoid state mutations after unmount.

3. **Performance & Memory:**

- Avoid creating new function references on every read call.
- Do not trigger signal notifications if the debounced value hasn't changed (strict reference equality `===`).

---

### **Key Edge Cases & Behavior to Consider**

- **Immediate Hydration / Initial Sync:** What happens if `source$` is a synchronous Observable (e.g., `of(10)` or a `BehaviorSubject`)? Ensure the initial value honors the debounce contract without causing hydration flickering.
- **Rapid Unmounts:** If the component unmounts while a debounced emission is pending in `setTimeout`, clean up the timer alongside the RxJS subscription.
- **Error Stream Isolation:** If `source$` emits an error, gracefully keep the last known valid signal value and allow an optional `onError?: (err: unknown) => void` handler option.

---
