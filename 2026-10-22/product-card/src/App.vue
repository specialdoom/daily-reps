<script setup lang="ts">
import ProductCard, { type Product } from "./ProductCard.vue";

const product: Product = {
  name: "Trail Runner 2",
  price: "$129",
  blurb: "Lightweight shoe with a grippy outsole for wet and dry trails.",
  image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='320' height='180' fill='%23bfdbfe'/></svg>",
};
</script>

<template>
  <main class="page">
    <h1>Shop</h1>
    <div class="layout">
      <aside class="sidebar">
        <h2>Recommended</h2>
        <ProductCard :product="product" />
      </aside>
      <section class="main">
        <h2>Featured</h2>
        <ProductCard :product="product" />
      </section>
      <section class="grid">
        <h2>All products</h2>
        <div class="grid__items">
          <ProductCard v-for="n in 4" :key="n" :product="product" />
        </div>
      </section>
    </div>
  </main>
</template>
