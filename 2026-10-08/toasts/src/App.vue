<script setup lang="ts">
import { ref } from 'vue'
import ToastHost from './components/ToastHost.vue'
import { type ToastKind, useToasts } from './stores/toasts.ts'
import { useLogger } from './stores/logger.ts'

const toasts = useToasts()
const logger = useLogger();

const message = ref('')
const duration = ref(5000);
const kind = ref<ToastKind>("info");
const kinds: ToastKind[] = ["info", "success", "error"];

function addNewToast() {
  toasts.push({ message: message.value.trim(), kind: kind.value, duration: duration.value })
  message.value = "";
}
</script>
<template>
  <main class="page">
    <section class="console" aria-labelledby="console-title">
      <header class="console__bar">
        <h2 id="console-title" class="console__title">Event log</h2>
        <span class="console__dots" aria-hidden="true"><i @click="logger.clear"></i><i></i><i></i></span>
      </header>
      <ol class="console__log">
        <li class="console__line" v-for="log in logger.logs" :key="log.timestamp">
          <time class="console__time">{{ new Date(log.timestamp).toLocaleString("en-UK", {
            hour: '2-digit', minute:
              '2-digit', hour12: false
          }) }}</time>
          <span class="console__tag">New</span>
          <span class="console__msg">{{ log.message }}</span>
        </li>
      </ol>
    </section>
    <form class="card" @submit.prevent="addNewToast">
      <h1 class="title">Send a toast</h1>

      <label class="field">
        <span class="label">Message</span>
        <textarea v-model="message" class="control" rows="3" placeholder="Saved!" />
      </label>

      <label class="field">
        <span class="label">Duration (ms, 0 = sticky)</span>
        <input v-model="duration" class="control" type="number" min="0" step="500" />
      </label>

      <fieldset class="field kinds">
        <legend class="label">Kind</legend>
        <label v-for="k in kinds" :key="k" class="kind" :class="`kind--${k}`">
          <input v-model="kind" type="radio" name="kind" :value="k" />
          <span>{{ k }}</span>
        </label>
      </fieldset>

      <button class="submit" type="submit" :disabled="message.trim() === ''">Send notification</button>
    </form>
  </main>
  <ToastHost />
</template>

<style>
body {
  margin: 0;
  min-height: 100vh;
  background-color: #fff4d6;
  background-image: radial-gradient(#000 1px, transparent 1px);
  background-size: 22px 22px;
  color: #000;
}
</style>

<style scoped>
.page {
  --nb-ink: #000;
  --nb-paper: #fff;
  --nb-border: 3px solid var(--nb-ink);

  display: grid;
  grid-template-columns: minmax(0, 28rem);
  justify-content: center;
  align-items: start;
  gap: 2.5rem;
  min-height: 100vh;
  padding: 3rem 1rem;
  box-sizing: border-box;
  font-family: 'Space Grotesk', 'Arial Black', system-ui, sans-serif;
}

@media (min-width: 960px) {
  .page {
    grid-template-columns: minmax(0, 34rem) minmax(0, 28rem);
  }
}

.console {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #111;
  border: var(--nb-border);
  box-shadow: 8px 8px 0 var(--nb-ink);
}

.console__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: #ffd43b;
  border-bottom: var(--nb-border);
}

.console__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.console__dots {
  display: flex;
  gap: 0.4rem;
}

.console__dots i {
  width: 0.85rem;
  height: 0.85rem;
  border: 2px solid var(--nb-ink);
  background: #ff8787;
}

.console__dots i:nth-child(2) {
  background: #a5d8ff;
}

.console__dots i:nth-child(3) {
  background: #b2f2bb;
}

.console__log {
  margin: 0;
  padding: 0.5rem 0;
  height: 22rem;
  overflow-y: auto;
  list-style: none;
  color: #f1f3f5;
  font-family: 'JetBrains Mono', ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  scrollbar-color: #ffd43b #111;
}

.console__log:empty::before {
  content: '> waiting for events_';
  display: block;
  padding: 0.25rem 0.75rem;
  color: #868e96;
}

.console__line {
  --line-accent: #f1f3f5;

  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.2rem 0.75rem;
  border-left: 4px solid transparent;
}

.console__line:hover {
  background: #1f1f1f;
  border-left-color: var(--line-accent);
}

.console__line--info {
  --line-accent: #a5d8ff;
}

.console__line--success {
  --line-accent: #b2f2bb;
}

.console__line--error {
  --line-accent: #ff8787;
}

.console__line--muted {
  --line-accent: #868e96;
  color: #868e96;
}

.console__time {
  color: #868e96;
}

.console__tag {
  padding: 0 0.35rem;
  background: var(--line-accent);
  color: var(--nb-ink);
  border: 2px solid var(--nb-ink);
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.console__msg {
  overflow-wrap: anywhere;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: min(28rem, 100%);
  padding: 1.75rem;
  box-sizing: border-box;
  background: var(--nb-paper);
  border: var(--nb-border);
  box-shadow: 8px 8px 0 var(--nb-ink);
}

.title {
  align-self: flex-start;
  margin: 0;
  padding: 0.25rem 0.75rem;
  background: #ffd43b;
  border: var(--nb-border);
  font-size: 1.5rem;
  font-weight: 900;
  text-transform: uppercase;
  transform: rotate(-2deg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.label {
  padding: 0;
  font-size: 0.85rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.control {
  padding: 0.65rem 0.75rem;
  background: var(--nb-paper);
  color: var(--nb-ink);
  border: var(--nb-border);
  border-radius: 0;
  box-shadow: 4px 4px 0 var(--nb-ink);
  font: inherit;
  font-weight: 700;
  resize: vertical;
  transition:
    transform 100ms ease,
    box-shadow 100ms ease,
    background 100ms ease;
}

.control:focus-visible {
  outline: none;
  background: #e7f5ff;
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--nb-ink);
}

.kinds {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.kinds .label {
  width: 100%;
  margin-bottom: 0.4rem;
}

.kind {
  --kind-bg: #a5d8ff;

  position: relative;
  cursor: pointer;
}

.kind--info {
  --kind-bg: #a5d8ff;
}

.kind--success {
  --kind-bg: #b2f2bb;
}

.kind--error {
  --kind-bg: #ff8787;
}

/* visually hidden, still focusable and announced */
.kind input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
}

.kind span {
  display: block;
  padding: 0.45rem 0.9rem;
  background: var(--nb-paper);
  border: var(--nb-border);
  box-shadow: 4px 4px 0 var(--nb-ink);
  font-weight: 800;
  text-transform: capitalize;
  transition:
    transform 80ms ease,
    box-shadow 80ms ease,
    background 80ms ease;
}

.kind:hover span {
  background: var(--kind-bg);
}

.kind input:checked+span {
  background: var(--kind-bg);
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 var(--nb-ink);
}

.kind input:focus-visible+span {
  outline: 3px solid var(--nb-ink);
  outline-offset: 3px;
}

.submit {
  padding: 0.85rem 1rem;
  background: #ff6b9d;
  color: var(--nb-ink);
  border: var(--nb-border);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--nb-ink);
  font: inherit;
  font-size: 1.05rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    transform 80ms ease,
    box-shadow 80ms ease;
}

.submit:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 8px 8px 0 var(--nb-ink);
}

.submit:active:not(:disabled) {
  transform: translate(6px, 6px);
  box-shadow: 0 0 0 var(--nb-ink);
}

.submit:focus-visible {
  outline: 3px solid var(--nb-ink);
  outline-offset: 4px;
}

.submit:disabled {
  background: #dee2e6;
  color: #495057;
  box-shadow: 3px 3px 0 var(--nb-ink);
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {

  .control,
  .kind span,
  .submit {
    transition: none;
  }

  .title,
  .control:focus-visible,
  .submit:hover:not(:disabled),
  .submit:active:not(:disabled) {
    transform: none;
  }
}
</style>
