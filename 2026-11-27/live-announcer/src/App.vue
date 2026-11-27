<script setup lang="ts">
import Toaster from "./Toaster.vue";
import { pushToast } from "./toasts";

function save() {
  pushToast("success", "Settings saved");
}
function fail() {
  pushToast("error", "Could not save: network error");
}
</script>

<template>
  <main>
    <h1>Settings</h1>
    <p>Click a button repeatedly, with a screen reader running (VoiceOver, NVDA or Orca).</p>
    <button type="button" @click="save">Save</button>
    <button type="button" @click="fail">Simulate failure</button>
    <Toaster />
  </main>
</template>

<style>
body { font-family: system-ui, sans-serif; margin: 2rem; }
button { margin-right: .5rem; }
</style>
