<script lang="ts">
  import { createListStore } from "./store.svelte";
  import TaskRow from "./lib/TaskRow.svelte";
  import type { Task } from "./lib/task";

  const store = createListStore<Task>();
  const selected = store.derivedFilter((item) => item.isSelected);
  const done = store.derivedFilter((item) => item.data.done);

  let title = $state("");

  function add(event: SubmitEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    store.addItem({ title: title.trim(), done: false, tags: [] });
    title = "";
  }

  function addMany(count: number) {
    const start = store.state.length;
    for (let i = 0; i < count; i++) {
      store.addItem({ title: `Task ${start + i + 1}`, done: false, tags: [] });
    }
  }

  function renameRandom() {
    const items = store.state;
    if (items.length === 0) return;
    const item = items[Math.floor(Math.random() * items.length)];
    store.updateField(item.id, "title", `${item.data.title}!`);
  }

  function burst() {
    // 5 synchronous updates: every reader re-runs once, not 5 times.
    const first = store.state[0];
    if (!first) return;
    for (let i = 1; i <= 5; i++) store.updateField(first.id, "title", `Burst ${i}`);
  }

  function removeSelected() {
    for (const item of selected.current) store.removeItem(item.id);
  }
</script>

<main>
  <h1>Reactive list engine</h1>
  <p>
    Each row shows how many times its own fields changed. Edit one row, or rename a
    random one out of thousands, and only that row's counter moves.
  </p>

  <form onsubmit={add}>
    <input bind:value={title} placeholder="New task" aria-label="New task" />
    <button type="submit">Add</button>
  </form>

  <div class="actions">
    <button onclick={() => addMany(1000)}>Add 1,000</button>
    <button onclick={renameRandom}>Rename a random task</button>
    <button onclick={burst}>5 sync updates to the first task</button>
    <button onclick={removeSelected} disabled={selected.current.length === 0}>
      Remove selected
    </button>
  </div>

  <p class="stats">
    {store.state.length} tasks · {selected.current.length} selected · {done.current.length} done
  </p>

  <ul>
    {#each store.state as item (item.id)}
      <TaskRow id={item.id} {store} />
    {/each}
  </ul>
</main>

<style>
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 16px;
    text-align: left;
  }
  form,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  form input {
    flex: 1;
    min-width: 0;
  }
  .stats {
    font-family: var(--mono);
    font-size: 0.85em;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
</style>
