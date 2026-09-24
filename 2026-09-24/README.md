# Frontend Daily Challenge — 2026-09-24

## 1. Immutable RxJS Todo Store

Build a small reactive todo store that exposes state changes through an RxJS `Observable` while guaranteeing that every state update is immutable.

### Goal

Implement `createTodoStore(initialTodos)` in your own JavaScript file. The returned store must expose:

- `state$`: an observable of the current state (`{ todos, filter }`)
- `addTodo(title)`: adds a todo with a unique `id`, the supplied `title`, and `completed: false`
- `toggleTodo(id)`: toggles one todo's `completed` value
- `removeTodo(id)`: removes one todo
- `setFilter(filter)`: accepts only `all`, `active`, or `completed`
- `visibleTodos$`: an observable containing todos matching the current filter
- `destroy()`: completes the store's observables

### Rules

1. Do not mutate the input array, todo objects, or previously emitted state objects.
2. Use RxJS primitives (`BehaviorSubject`, `Observable`, and/or operators) rather than manually notifying subscribers.
3. `state$` must immediately emit the initial state to a new subscriber.
4. Preserve insertion order when adding todos.
5. Calling `toggleTodo` or `removeTodo` with an unknown ID must leave state unchanged.
6. Trim titles. Reject empty titles without emitting a new state.
7. Add at least five tests, including an immutability test and a late-subscriber test.

### Example

```js
const store = createTodoStore([]);

store.visibleTodos$.subscribe(console.log);
// []

store.addTodo("Learn observables");
// [{ id: '...', title: 'Learn observables', completed: false }]

store.setFilter("completed");
// []
```

### Stretch goals

- Add an `updateTodo(id, title)` operation.
- Add an undo operation that restores the previous state without mutating history.
- Expose a `loading$` observable and simulate persistence with `switchMap`.

Run your tests with the test runner configured for your preferred frontend stack (for example, Vitest or Jest).

### Test ideas

Use these cases to drive your implementation:

1. A new store emits `{ todos: [], filter: 'all' }` immediately.
2. `addTodo('  Write tests  ')` emits one todo with title `Write tests`.
3. Empty or whitespace-only titles do not emit a new state.
4. `toggleTodo(id)` changes only the matching todo.
5. `removeTodo(id)` removes only the matching todo.
6. `setFilter('active')` makes `visibleTodos$` exclude completed todos.
7. An unknown ID does not change the state reference or contents.
8. Mutating the original `initialTodos` after store creation does not affect the store.
9. Mutating an object received by a subscriber does not mutate later store emissions.
10. A subscriber added after an update immediately receives the latest state.
11. `destroy()` completes both public observables.

## 2. Strongly-Typed Event Emitter

**Focus Area:** TypeScript, Event-Driven Architecture, Object-Oriented Design

**Difficulty:** Intermediate

## 🎯 Task Summary

Design and implement a generic `EventEmitter` class in TypeScript. The class serves as a central pub/sub mechanism allowing application modules to subscribe to, emit, and handle custom events in a type-safe manner.

## 📐 Architecture & Type System Requirements

1. **Generic Event Map:**
   - The `EventEmitter` class must accept a single generic type parameter representing an event map interface (`Record<string, any>`).

   - Keys of this interface represent allowed **event names**.

   - Values represent the **payload type** associated with each event name.

2. **Type Safety Rules:**
   - Handlers registered for an event must strictly enforce that their payload parameter matches the defined type for that specific event name in the generic map.

   - Emitting an event must require a payload that strictly conforms to the type associated with that event key.

   - Invalid event names or payload types must trigger TypeScript compiler errors.

## 🛠️ Interface Specifications

### 1. Subscription (`on`)

- **Signature:** Takes an event name and a callback function matching the payload type for that event.

- **Return Value:** Returns a subscription object containing an `unsubscribe()` method.

- **Behavior:**
  - Multiple callbacks can be registered for the same event name.

  - Executing `unsubscribe()` removes that specific callback from the active listener pool for the given event without affecting other listeners.

  - Unsubscribing a listener multiple times must be safe and idempotent (no errors or unexpected state corruption).

### 2. Emission (`emit`)

- **Signature:** Takes an event name and a payload corresponding to that event name.

- **Return Value:** `void`.

- **Behavior:**
  - Synchronously invokes all registered callbacks for the given event in the exact order they were registered.

  - If no listeners are registered for the event, `emit` should execute without errors.

### 3. Single-Execution Listener (`once`)

- **Signature:** Takes an event name and a callback function.

- **Return Value:** `void` (or optionally a subscription handle with an `unsubscribe` method).

- **Behavior:**
  - Registers a callback that executes at most **once**.

  - Immediately after its first execution during an `emit`, the callback must automatically unsubscribe itself so that subsequent emissions of the same event will not trigger it.

## 🚨 Edge Cases & Handling

- **Listener Removal During Emission:** If a listener unsubscribes itself or other listeners during an `emit` call, the emitter must safely handle iteration without skipping remaining callbacks or encountering array index issues.

- **Execution Isolation:** An error thrown by one listener during an `emit` call should ideally be handled or isolated so it does not stop subsequent listeners in the chain from executing (Bonus).

## 🧪 Expected Behavior Workflow

1. **Instantiation:** Create an instance of `EventEmitter` bound to a typed map of events.

2. **Registration:** Register a callback on an event using `.on()`.

3. **Dispatch:** Call `.emit()` on that event name with a valid payload, causing the registered callback to fire with the payload.

4. **Cleanup:** Execute `.unsubscribe()` from the returned handle, ensuring subsequent `.emit()` calls no longer fire the callback.

5. **One-off Execution:** Register a callback using `.once()`, emit the event twice, and verify that the callback only runs during the first emission.

---

## 🧪 Test Cases Specification

Use these test case descriptions or unit tests (e.g., using Jest or Vitest) to verify your implementation.

### Event Interface Setup

```typescript
interface TestEvents {
  userLogin: { userId: string; timestamp: number };
  themeChange: "light" | "dark";
  ping: void;
}
```

### Test Suite

#### 1. Basic Registration & Emission

- **Scenario:** Subscribing to an event and emitting data.
- **Steps:**
  1. Register a listener on `'userLogin'`.
  2. Emit `'userLogin'` with `{ userId: 'usr_1', timestamp: 1000 }`.
- **Assertion:** The listener receives the exact object `{ userId: 'usr_1', timestamp: 1000 }` once.

#### 2. Unsubscribing via Returned Handle

- **Scenario:** Deregistering a specific callback.
- **Steps:**
  1. Register `listenerA` and `listenerB` on `'themeChange'`.
  2. Unsubscribe `listenerA` using its returned `{ unsubscribe }` object.
  3. Emit `'themeChange'` with `'dark'`.
- **Assertion:** `listenerA` is **not** called. `listenerB` is called with `'dark'`.
- **Idempotency Check:** Call `listenerA`'s `unsubscribe()` again. Verify no errors occur on subsequent emits.

#### 3. Single-Execution Listener (`once`)

- **Scenario:** Ensuring `once` listeners execute only once.
- **Steps:**
  1. Register a listener on `'ping'` using `.once()`.
  2. Emit `'ping'` twice consecutively.
- **Assertion:** The callback executes exactly **1 time** on the first emit, and **0 times** on the second emit.

#### 4. Listener Removal During Emission (Edge Case)

- **Scenario:** A listener unsubscribes itself or another listener _while_ an event is currently emitting.
- **Steps:**
  1. Register `listener1`, `listener2`, and `listener3` on `'ping'`.
  2. Inside `listener1`, execute `sub2.unsubscribe()` (unsubscribing `listener2`).
  3. Emit `'ping'`.
- **Assertion:** `listener1` executes. `listener3` executes. `listener2` does **not** execute, and no runtime iteration errors occur.

#### 5. Listener Error Isolation (Bonus Case)

- **Scenario:** Handling runtime errors inside subscriber callbacks.
- **Steps:**
  1. Register `listener1` (which throws `new Error('Crash')`), and `listener2` on `'ping'`.
  2. Emit `'ping'`.
- **Assertion:** `listener2` executes successfully despite the error thrown by `listener1`.
