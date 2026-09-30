<script lang="ts">
  import type { ListItemId } from "../store.svelte";
  import type { TaskStore } from "./task";

  let { id, store }: { id: ListItemId; store: TaskStore } = $props();

  // getItem subscribes this row to its own key only, so other rows' changes never reach it.
  const item = $derived(store.getItem(id));

  // Counts how often this row's fields change, without re-rendering to show it:
  // a $state counter would itself re-render the row.
  let badge = $state<HTMLElement>();
  let updates = 0;
  $effect(() => {
    if (!item || !badge) return;
    void [item.data.title, item.data.done, item.isSelected, item.data.tags.length];
    badge.textContent = `${updates++} updates`;
  });
</script>

{#if item}
  <li class:selected={item.isSelected} class:done={item.data.done}>
    <input
      type="checkbox"
      aria-label="Select"
      checked={item.isSelected}
      onchange={(e) => store.setIsSelected(id, e.currentTarget.checked)}
    />
    <input
      class="title"
      aria-label="Title"
      value={item.data.title}
      onchange={(e) => store.updateField(id, "title", e.currentTarget.value)}
    />
    <label>
      <input
        type="checkbox"
        checked={item.data.done}
        onchange={(e) => store.updateField(id, "done", e.currentTarget.checked)}
      />
      done
    </label>
    <button
      class="tags"
      title="Replace the tags array"
      onclick={() => store.updateField(id, "tags", [...item.data.tags, `#${item.data.tags.length + 1}`])}
    >
      tags: {item.data.tags.join(" ") || "—"}
    </button>
    <span class="badge" bind:this={badge}></span>
    <button aria-label="Remove" onclick={() => store.removeItem(id)}>✕</button>
  </li>
{/if}

<style>
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
  }
  li.selected {
    background: var(--accent-bg);
  }
  li.done .title {
    text-decoration: line-through;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  .tags {
    font-family: var(--mono);
    font-size: 0.8em;
  }
  .badge {
    font-family: var(--mono);
    font-size: 0.75em;
    white-space: nowrap;
  }
</style>
