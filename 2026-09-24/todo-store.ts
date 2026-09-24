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

export function createTodoStore(initialTodos: Todo[]): TodoStore {
  const initialState: TodoState = {
    todos: initialTodos.map((todo) => ({ ...todo })),
    filter: "all",
  };

  const stateSubject = new BehaviorSubject<TodoState>(initialState);

  const state$ = stateSubject.asObservable();

  const visibleTodos$ = state$.pipe(
    map((state) => {
      const currentFilter = state.filter;

      if (currentFilter === "all") {
        return state.todos;
      }

      const filteredTodos = state.todos.filter((todo) => {
        return currentFilter === "completed" ? todo.completed : !todo.completed;
      });
      return [...filteredTodos];
    }),
  );

  function addTodo(title: string): void {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const currentState = stateSubject.getValue();

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      completed: false,
    };

    stateSubject.next({
      ...currentState,
      todos: [...currentState.todos, newTodo],
    });
  }

  function toggleTodo(id: TodoID) {
    const currentState = stateSubject.getValue();
    const currentTodos = currentState.todos;

    const exists = currentTodos.find((todo) => todo.id === id);

    if (!exists) return;

    stateSubject.next({
      ...currentState,
      todos: currentState.todos.map((todo) => {
        if (todo.id === id) return { ...todo, completed: !todo.completed };

        return todo;
      }),
    });
  }

  function destroy() {
    stateSubject.complete();
  }

  function removeTodo(id: TodoID) {
    const currentState = stateSubject.getValue();
    const filteredTodos = currentState.todos.filter((todo) => todo.id !== id);

    stateSubject.next({
      ...currentState,
      todos: [...filteredTodos],
    });
  }

  function setFilter(filter: TodoFilter) {
    stateSubject.next({
      ...stateSubject.getValue(),
      filter,
    });
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

const store = createTodoStore([]);

store.addTodo("Learn observable");
store.addTodo("Learn observable second part");
