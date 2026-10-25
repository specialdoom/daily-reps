<script lang="ts">
  import Menu from "./Menu.svelte";

  let accountOpen = $state(false);
</script>

<main>
  <h1>Popover menu</h1>

  <Menu label="Account" bind:open={accountOpen}>
    <p>Signed in as ada@example.com</p>
    <button type="button" onclick={() => (accountOpen = false)}>Sign out</button>
  </Menu>

  <p data-testid="state">Account menu is {accountOpen ? "open" : "closed"}</p>
  <button type="button" onclick={() => (accountOpen = true)}>Open from outside</button>
</main>
