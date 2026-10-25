<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    open = $bindable(false),
    children,
  }: { label: string; open?: boolean; children: Snippet } = $props();

  const id = $props.id();

  // TODO: keep `open` and the native popover state in sync, in both directions.
</script>

<button type="button" popovertarget={id} aria-expanded={open}>{label}</button>

<div {id} popover="auto" class="panel">
  {@render children()}
</div>

<style>
  .panel {
    margin: 0;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    position-area: bottom span-right;
  }
  button {
    anchor-name: --trigger;
  }
  .panel {
    position-anchor: --trigger;
  }
</style>
