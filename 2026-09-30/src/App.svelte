<script lang="ts">
  import { createListStore } from "./store.svelte";

  const listStore = createListStore([]);

  let currentItem = $state("");

  function add() {
    listStore.addItem(currentItem);
    currentItem = "";
  }
</script>

<input type="text" value={currentItem} /> <button onclick={add}>Add</button>

<ul>
{#each listStore.state as listItem} 
  <li>{listItem.data}</li>
{/each}
</ul>