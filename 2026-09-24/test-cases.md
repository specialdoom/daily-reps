# Test ideas

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
