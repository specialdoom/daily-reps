<script setup lang="ts">
import ProductCard from "./ProductCard.vue";

const card = {
  title: "Trail Runner 3",
  price: "$129",
  blurb: "Light, grippy and ready for wet rock. Available in four colours.",
};
</script>

<template>
  <div class="page">
    <main class="main">
      <h2>Featured (wide slot)</h2>
      <ProductCard v-bind="card" />
    </main>
    <aside class="side">
      <h2>Related (narrow slot)</h2>
      <ProductCard v-bind="card" />
    </aside>
  </div>
</template>

<style>
body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #f3f4f7; }
.page { display: grid; grid-template-columns: 1fr 260px; gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
h2 { font-size: 1rem; }
</style>
