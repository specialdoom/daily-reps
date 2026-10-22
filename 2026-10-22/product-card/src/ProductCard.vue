<script setup lang="ts">
export interface Product {
  name: string;
  price: string;
  blurb: string;
  image: string;
}

defineProps<{ product: Product }>();
</script>

<template>
  <article class="card">
    <img class="card__image" :src="product.image" :alt="product.name" />
    <div class="card__body">
      <h3 class="card__title">{{ product.name }}</h3>
      <p class="card__blurb">{{ product.blurb }}</p>
      <p class="card__price">{{ product.price }}</p>
      <button class="card__buy" type="button">Add to cart</button>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #d0d5dd;
  border-radius: 0.75rem;
  background: #fff;
}

.card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0.5rem;
}

.card__title {
  margin: 0;
  font-size: 1rem;
}

.card__blurb {
  margin: 0.25rem 0 0;
  color: #475467;
  font-size: 0.875rem;
}

.card__price {
  margin: 0.5rem 0;
  font-weight: 700;
}

.card__buy {
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 0.5rem;
  background: #1d4ed8;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

/* TODO: make the layout respond to the card's own width */
@media (min-width: 700px) {
  .card {
    grid-template-columns: 12rem 1fr;
  }

  .card__blurb {
    font-size: 1rem;
  }
}
</style>
