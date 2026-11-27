<script setup lang="ts">
import { toasts } from "./toasts";
</script>

<template>
  <!-- TODO: screen-reader users report that saves are silent or announced only sometimes. -->
  <div v-if="toasts.length" class="toaster" role="status" aria-live="polite">
    <p v-for="t in toasts" :key="t.id" :class="['toast', t.kind]">{{ t.message }}</p>
  </div>
</template>

<style scoped>
.toaster { position: fixed; right: 1rem; bottom: 1rem; display: grid; gap: .5rem; }
.toast { margin: 0; padding: .6rem .9rem; border-radius: .4rem; background: #1f2937; color: #fff; }
.toast.error { background: #b91c1c; }
</style>
