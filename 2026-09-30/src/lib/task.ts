import { createListStore } from "../store.svelte";

export type Task = { title: string; done: boolean; tags: string[] };

export type TaskStore = ReturnType<typeof createListStore<Task>>;
