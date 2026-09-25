# Frontend Daily Challenge — 2026-09-24

### 1. Immutable RxJS Todo Store (solved in todo-store.ts)

**Focus Area:** RxJS, State Management, Immutability

**Difficulty:** Intermediate

## 🎯 Task Summary

Build a small reactive todo store that exposes state changes through an RxJS `Observable` while ensuring every update is immutable.

## 📐 Requirements

- Use a single state object shaped like `{ todos, filter }`.
- Keep updates immutable by creating new arrays and objects instead of mutating existing values.
- Expose `state$` and `visibleTodos$` as observables.
- Support `addTodo`, `toggleTodo`, `removeTodo`, `setFilter`, and `destroy`.
- `state$` must emit the current state immediately to a new subscriber.
- Ignore empty titles and unknown IDs without changing state.
- Preserve insertion order and current filter state.

## 🛠️ Interface

- `state$`: current state observable
- `visibleTodos$`: filtered todo list observable
- `addTodo(title)`: adds a todo with a generated `id` and `completed: false`
- `toggleTodo(id)`: toggles a todo's completion status
- `removeTodo(id)`: removes a todo
- `setFilter(filter)`: supports `all`, `active`, and `completed`
- `destroy()`: completes the observables

## 🚨 Edge Cases

- Empty or whitespace-only titles should be rejected.
- Unknown IDs should leave state unchanged.
- A late subscriber should receive the latest state immediately.
- Mutating a value emitted by a subscriber should not affect later emissions.
- The original `initialTodos` input must not be mutated.

## 🧪 Test Cases

- Initial state emits `{ todos: [], filter: "all" }` immediately.
- `addTodo("  Write tests  ")` adds a todo titled `"Write tests"`.
- Empty title does not emit a new state.
- `toggleTodo(id)` flips only the matching todo.
- `removeTodo(id)` removes only the matching todo.
- `setFilter("active")` filters out completed todos.
- Unknown IDs do not change state.
- Original input array remains unchanged.
- A subscriber added after an update receives the current state immediately.
- `destroy()` completes the public observables.

---

## 2. Strongly-Typed Event Emitter

**Focus Area:** TypeScript, Event-Driven Architecture

**Difficulty:** Intermediate

## 🎯 Task Summary

Design and implement a generic `EventEmitter` class in TypeScript that supports typed subscriptions and emissions.

## 📐 Requirements

- Accept a generic event map (`Record<string, any>`).
- `on(eventName, handler)` must enforce the correct payload type for that event.
- `emit(eventName, payload)` must also enforce the matching payload type.
- Support `once(eventName, handler)` for one-time listeners.
- Allow `unsubscribe()` on the returned subscription handle.
- Unsubscribing multiple times must be safe.
- Listener errors should not block the rest of the listeners.

## 🛠️ Interface

- `on(eventName, handler)`
- `emit(eventName, payload)`
- `once(eventName, handler)`
- Returns a subscription object with `unsubscribe()`

## 🚨 Edge Cases

- If a listener unsubscribes during emission, the loop should continue safely.
- If one listener throws, later listeners should still run.
- No listeners for an event should not throw.

## 🧪 Test Cases

- Register a listener and emit a payload; listener receives the exact payload.
- Unsubscribe one listener and verify only the remaining listener fires.
- `once()` listeners fire only once.
- A listener unsubscribing itself or another listener during emission does not break iteration.
- A callback that throws does not prevent later listeners from executing.

---

This keeps both sections aligned with the same concise pattern: summary, requirements, interface, edge cases, and tests.
