<script lang="ts">
  import { fetchPage, type Post } from "./api";

  let posts = $state<Post[]>([]);
  let cursor = $state<number | null>(0);
  let loading = $state(false);

  async function loadMore() {
    // TODO: guard against concurrent / finished loads
    if (cursor === null) return;
    loading = true;
    const page = await fetchPage(cursor);
    posts.push(...page.items);
    cursor = page.nextCursor;
    loading = false;
  }

  // TODO: load the next page when the sentinel below scrolls into view
  // (no scroll listeners). For now, a button is the only way to load.
</script>

<main>
  <h1>Feed</h1>
  <ul>
    {#each posts as post (post.id)}
      <li>{post.title}</li>
    {/each}
  </ul>

  <!-- sentinel goes here -->
  <button onclick={loadMore} disabled={loading || cursor === null}>Load more</button>

  {#if loading}<p role="status">Loading…</p>{/if}
  {#if cursor === null}<p role="status">You're all caught up.</p>{/if}
</main>

<style>
  main { max-width: 32rem; margin: 0 auto; padding: 1rem; font-family: system-ui, sans-serif; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 1.5rem 1rem; border-bottom: 1px solid #ddd; }
</style>
