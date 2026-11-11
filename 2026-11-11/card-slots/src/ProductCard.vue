<script setup lang="ts">
defineProps<{ title: string; price: string; blurb: string }>();
</script>

<template>
  <article class="card">
    <div class="thumb" aria-hidden="true"></div>
    <div class="body">
      <h3>{{ title }}</h3>
      <p class="blurb">{{ blurb }}</p>
      <p class="price">{{ price }}</p>
    </div>
  </article>
</template>

<style scoped>
/* TODO: the card should lay itself out by the width of the SLOT it is placed in,
   not by the viewport. */
.card {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #c9ced6;
  border-radius: 8px;
  background: #fff;
}
.thumb {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #6d8cff, #b06dff);
  border-radius: 6px;
}
h3 { margin: 0 0 0.25rem; }
.blurb { margin: 0 0 0.5rem; color: #4a5260; }
.price { margin: 0; font-weight: 700; }
</style>
