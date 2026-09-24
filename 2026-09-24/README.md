# Frontend Daily Challenge — 2026-09-24

## Immutable RxJS Todo Store

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

store.addTodo('Learn observables');
// [{ id: '...', title: 'Learn observables', completed: false }]

store.setFilter('completed');
// []
```

### Stretch goals

- Add an `updateTodo(id, title)` operation.
- Add an undo operation that restores the previous state without mutating history.
- Expose a `loading$` observable and simulate persistence with `switchMap`.

Run your tests with the test runner configured for your preferred frontend stack (for example, Vitest or Jest).
