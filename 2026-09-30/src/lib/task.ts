import type { ListStore } from "../store.svelte";

export type Task = { title: string; done: boolean; tags: string[] };

export type TaskStore = ListStore<Task>;
