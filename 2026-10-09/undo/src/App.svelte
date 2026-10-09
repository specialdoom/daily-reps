<script lang="ts">
  import type { Board } from "./lib/types";
  import { createHistory } from "./lib/history.svelte";

  let board: Board = $state({
    name: "Sprint",
    cards: [{ id: 1, title: "Write tests", tags: ["qa"] }],
  });

  const history = createHistory(board);
  let nextId = 2;
</script>

<input
  bind:value={board.name}
  aria-label="Board name"
  onchange={() => {
    history.commit();
  }}
/>
<button
  onclick={() => {
    board.cards.push({ id: nextId++, title: "New card", tags: [] });
    history.commit();
  }}
>
  Add card
</button>
<button onclick={history.undo} disabled={!history.canUndo}>Undo</button>
<button onclick={history.redo} disabled={!history.canRedo}>Redo</button>

{#each board.cards as card (card.id)}
  <div>
    <input
      bind:value={card.title}
      aria-label="Card title"
      onchange={() => {
        history.commit();
      }}
    />
    <button
      onclick={() => {
        card.tags.push("new");
        history.commit();
      }}>Tag</button
    >
    <span>{card.tags.join(", ")}</span>
  </div>
{/each}
