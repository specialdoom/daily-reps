import { describe, expect, it } from "vitest";
import { createTodoStore, Todo, TodoState } from "./todo-store.js";

describe("createTodoStore", () => {
  it("emits the initial state immediately", () => {
    const store = createTodoStore([]);
    let receivedState: TodoState | undefined;

    const subscription = store.state$.subscribe((state) => {
      receivedState = state;
    });

    expect(receivedState).toEqual({ todos: [], filter: "all" });

    subscription.unsubscribe();
    store.destroy();
  });

  it("adds a trimmed todo", () => {
    const store = createTodoStore([]);
    let latestState: TodoState | undefined;

    const subscription = store.state$.subscribe((state) => {
      latestState = state;
    });

    store.addTodo("  Learn RxJS  ");

    expect(latestState?.todos).toHaveLength(1);
    expect(latestState?.todos[0]).toMatchObject({
      title: "Learn RxJS",
      completed: false,
    });
    expect(latestState?.todos[0].id).toEqual(expect.any(String));

    subscription.unsubscribe();
    store.destroy();
  });

  it("does not add an empty todo", () => {
    const store = createTodoStore([]);
    const states: TodoState[] = [];

    const subscription = store.state$.subscribe((state) => {
      states.push(state);
    });

    store.addTodo("   ");

    expect(states).toHaveLength(1);
    expect(states[0].todos).toEqual([]);

    subscription.unsubscribe();
    store.destroy();
  });

  it("preserves the active filter when adding a todo", () => {
    const store = createTodoStore([]);
    let latestState: TodoState | undefined;

    const subscription = store.state$.subscribe((state) => {
      latestState = state;
    });

    store.setFilter("active");
    store.addTodo("Learn immutability");

    expect(latestState?.filter).toBe("active");

    subscription.unsubscribe();
    store.destroy();
  });

  it("does not mutate the initial todos", () => {
    const initialTodos: Todo[] = [
      { id: "1", title: "Existing todo", completed: false },
    ];
    const initialTodosSnapshot = structuredClone(initialTodos);
    const store = createTodoStore(initialTodos);

    store.addTodo("New todo");

    expect(initialTodos).toEqual(initialTodosSnapshot);
    expect(initialTodos).toHaveLength(1);

    store.destroy();
  });

  it("creates new state and todos references when adding a todo", () => {
    const store = createTodoStore([]);
    const states: TodoState[] = [];
    const subscription = store.state$.subscribe((state) => {
      states.push(state);
    });

    store.addTodo("Immutable todo");

    expect(states).toHaveLength(2);
    expect(states[1]).not.toBe(states[0]);
    expect(states[1].todos).not.toBe(states[0].todos);

    subscription.unsubscribe();
    store.destroy();
  });

  it("toggles a todo", () => {
    const store = createTodoStore([
      { id: "1", title: "Learn testing", completed: false },
    ]);

    store.toggleTodo("1");

    let latestState: TodoState | undefined;
    const subscription = store.state$.subscribe((state) => {
      latestState = state;
    });

    expect(latestState?.todos[0].completed).toBe(true);

    subscription.unsubscribe();
    store.destroy();
  });

  it("removes a todo", () => {
    const store = createTodoStore([
      { id: "1", title: "Keep this", completed: false },
      { id: "2", title: "Remove this", completed: false },
    ]);

    store.removeTodo("2");

    let latestState: TodoState | undefined;
    const subscription = store.state$.subscribe((state) => {
      latestState = state;
    });

    expect(latestState?.todos).toEqual([
      { id: "1", title: "Keep this", completed: false },
    ]);

    subscription.unsubscribe();
    store.destroy();
  });

  it("does not emit when removing an unknown todo", () => {
    const store = createTodoStore([
      { id: "1", title: "Existing todo", completed: false },
    ]);
    const states: TodoState[] = [];
    const subscription = store.state$.subscribe((state) => {
      states.push(state);
    });
    const originalState = states[0];

    store.removeTodo("unknown-id");

    expect(states).toHaveLength(1);
    expect(states[0]).toBe(originalState);

    subscription.unsubscribe();
    store.destroy();
  });

  it("filters visible todos", () => {
    const store = createTodoStore([
      { id: "1", title: "Active todo", completed: false },
      { id: "2", title: "Completed todo", completed: true },
    ]);
    let visibleTodos: Todo[] = [];
    const subscription = store.visibleTodos$.subscribe((todos) => {
      visibleTodos = todos;
    });

    store.setFilter("active");
    expect(visibleTodos).toEqual([
      { id: "1", title: "Active todo", completed: false },
    ]);

    store.setFilter("completed");
    expect(visibleTodos).toEqual([
      { id: "2", title: "Completed todo", completed: true },
    ]);

    subscription.unsubscribe();
    store.destroy();
  });

  it("immediately provides the latest state to a late subscriber", () => {
    const store = createTodoStore([]);
    store.addTodo("Late subscriber test");
    let receivedState: TodoState | undefined;

    const subscription = store.state$.subscribe((state) => {
      receivedState = state;
    });

    expect(receivedState?.todos).toHaveLength(1);
    expect(receivedState?.todos[0].title).toBe("Late subscriber test");

    subscription.unsubscribe();
    store.destroy();
  });

  it("protects state from mutations made by subscribers", () => {
    const store = createTodoStore([]);
    let receivedState: TodoState | undefined;
    const subscription = store.state$.subscribe((state) => {
      receivedState = state;
    });

    receivedState?.todos.push({
      id: "external",
      title: "External mutation",
      completed: false,
    });

    let latestState: TodoState | undefined;
    const secondSubscription = store.state$.subscribe((state) => {
      latestState = state;
    });

    expect(latestState?.todos).toEqual([]);

    subscription.unsubscribe();
    secondSubscription.unsubscribe();
    store.destroy();
  });

  it("completes its observables when destroyed", () => {
    const store = createTodoStore([]);
    let stateCompleted = false;
    let visibleTodosCompleted = false;

    const stateSubscription = store.state$.subscribe({
      complete: () => {
        stateCompleted = true;
      },
    });
    const visibleTodosSubscription = store.visibleTodos$.subscribe({
      complete: () => {
        visibleTodosCompleted = true;
      },
    });

    store.destroy();

    expect(stateCompleted).toBe(true);
    expect(visibleTodosCompleted).toBe(true);

    stateSubscription.unsubscribe();
    visibleTodosSubscription.unsubscribe();
  });
});
