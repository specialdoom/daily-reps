import { BehaviorSubject, map, Observable } from "rxjs";

type TodoID = string;

export type Todo = {
  id: TodoID;
  title: string;
  completed: boolean;
};

export type TodoFilter = "all" | "active" | "completed";

export type TodoState = {
  todos: Todo[];
  filter: TodoFilter;
};

export type TodoStore = {
  state$: Observable<TodoState>;
  visibleTodos$: Observable<Todo[]>;
  addTodo: (title: string) => void;
  toggleTodo: (id: TodoID) => void;
  destroy: () => void;
  removeTodo: (id: TodoID) => void;
  setFilter: (filter: TodoFilter) => void;
};

export function createTodoStore(initialTodos: Todo[] = []): TodoStore {
  // Copy the incoming array and its todo objects so later changes made by the
  // caller cannot mutate the store's initial state.
  const initialState: TodoState = {
    todos: initialTodos.map((todo) => ({ ...todo })),
    filter: "all",
  };

  // BehaviorSubject is useful for a state store because it keeps the latest
  // value and immediately gives that value to every late subscriber.
  const stateSubject = new BehaviorSubject<TodoState>(initialState);

  // Keep the subject private so consumers can observe state but cannot call
  // next() and bypass the store's update rules.
  const state$ = stateSubject.pipe(
    map((state) => ({
      ...state,
      // Return copies at the public boundary to prevent subscribers from
      // mutating the state retained by the subject.
      todos: state.todos.map((todo) => ({ ...todo })),
    })),
  );

  // Derive visible todos from state rather than maintaining a second mutable
  // source of truth. Each emission creates a new array for subscribers.
  const visibleTodos$ = state$.pipe(
    map((state) => {
      if (state.filter === "all") {
        return [...state.todos];
      }

      return state.todos.filter((todo) =>
        state.filter === "completed" ? todo.completed : !todo.completed,
      );
    }),
  );

  function addTodo(title: string): void {
    const trimmedTitle = title.trim();

    // Invalid input does not produce a new state emission.
    if (!trimmedTitle) {
      return;
    }

    const currentState = stateSubject.getValue();
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      completed: false,
    };

    // Spread the current state to preserve the active filter and create a new
    // todos array instead of mutating the previous state.
    stateSubject.next({
      ...currentState,
      todos: [...currentState.todos, newTodo],
    });
  }

  function toggleTodo(id: TodoID): void {
    const currentState = stateSubject.getValue();

    // Unknown IDs leave the state and its reference unchanged.
    if (!currentState.todos.some((todo) => todo.id === id)) {
      return;
    }

    stateSubject.next({
      ...currentState,
      todos: currentState.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  }

  function removeTodo(id: TodoID): void {
    const currentState = stateSubject.getValue();

    // Avoid emitting a new state when there is nothing to remove.
    if (!currentState.todos.some((todo) => todo.id === id)) {
      return;
    }

    stateSubject.next({
      ...currentState,
      todos: currentState.todos.filter((todo) => todo.id !== id),
    });
  }

  function setFilter(filter: TodoFilter): void {
    const currentState = stateSubject.getValue();

    // Avoid a redundant emission when the requested filter is already active.
    if (currentState.filter === filter) {
      return;
    }

    stateSubject.next({
      ...currentState,
      filter,
    });
  }

  function destroy(): void {
    // Completing the private subject completes state$ and its derived streams.
    stateSubject.complete();
  }

  return {
    state$,
    visibleTodos$,
    addTodo,
    toggleTodo,
    removeTodo,
    setFilter,
    destroy,
  };
}
