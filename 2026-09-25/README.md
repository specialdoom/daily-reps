# Frontend Daily Challenge — 2026-09-25

## Type-Safe Reactive State Store

**Focus Area:** TypeScript, State Management, Reactivity

**Difficulty:** Intermediate

## 🎯 Task Summary

Implement a lightweight, strongly typed state store in TypeScript, inspired by libraries such as Redux and Zustand. The store should support atomic updates, computed state, and scoped selector subscriptions.

## 📐 Requirements

### State Initialization

- Accept an initial state object.
- Fully infer the state shape through TypeScript.
- Prevent callers from mutating the store's state from outside.

### Core API

- `getState()`: returns the current state snapshot.
- `setState(updater)`: accepts either a partial state object or a function that receives the current state and returns a partial state.
- Notify subscribers only when their selected state changes.
- `subscribe(selector, listener)`: subscribes to a selected slice of state.
- Use strict equality checking (`===`) to detect selected-value changes.
- Return an `unsubscribe()` function.

### Computed State Bonus

Implement a `createComputed(store, selector)` helper that creates a read-only derived value and re-evaluates only when the selector's dependencies change.

## 🛠️ Suggested Interface

- `getState()`
- `setState(updater)`
- `subscribe(selector, listener)`
- `createComputed(store, selector)`

## 🚨 Edge Cases

- Setting an unrelated property should not notify subscribers selecting another property.
- Setting a property to the same value should not notify its subscribers.
- Both object and function updates should preserve the rest of the state.
- Unsubscribed listeners should never be called again.
- Subscribers should receive the selected value according to the chosen equality behavior.
- External callers must not be able to mutate the store through a returned state reference.
- Computed values should not recalculate when their selected dependencies have not changed.

## 🧪 Test Cases

- The initial state is returned by `getState()`.
- A partial update changes only the specified properties.
- A functional update receives the current state and updates correctly.
- A subscriber is called when its selected value changes.
- A subscriber is not called when an unrelated value changes.
- A subscriber is not called when its selected value remains strictly equal.
- Calling `unsubscribe()` prevents future notifications.
- Multiple subscribers can select different slices independently.
- A computed value updates when its dependencies change.
- A computed value does not re-evaluate for unrelated state changes.

---

Implement the core store first, then add the computed-state helper as a bonus.
