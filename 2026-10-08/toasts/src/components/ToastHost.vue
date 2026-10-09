<script setup lang="ts">
import { computed, onUnmounted } from 'vue';
import { useToastStore } from '../stores/toasts.ts'

const store = useToastStore()
const errorToasts = computed(
  () => store.toasts.filter(t => t.kind === "error"));
const remainingToasts = computed(() => store.toasts.filter(t => t.kind !== "error"));

// Where focus came from when it entered each toast, so Escape can send it back.
const returnFocusTo = new Map<number, HTMLElement>();

function focusin(event: FocusEvent, id: number) {
  const li = event.currentTarget as HTMLElement;
  const from = event.relatedTarget;
  if (from instanceof HTMLElement && !li.contains(from)) {
    returnFocusTo.set(id, from);
  }
  store.stopTimer(id, "focus");
}

function focusout(event: FocusEvent, id: number) {
  const li = event.currentTarget as HTMLElement;
  // Moving between elements inside the same toast keeps it paused.
  if (event.relatedTarget instanceof Node && li.contains(event.relatedTarget)) return;
  store.continueTimer(id, "focus");
}

function dismiss(id: number) {
  returnFocusTo.delete(id);
  store.dismiss(id);
}

function escape(event: KeyboardEvent, id: number) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  const target = returnFocusTo.get(id);
  dismiss(id);
  if (target?.isConnected) {
    target.focus();
  } else {
    (document.activeElement as HTMLElement | null)?.blur();
  }
}

onUnmounted(() => {
  // The store outlives the host; don't let its timers fire into an unmounted UI.
  store.clear();
  returnFocusTo.clear();
});
</script>

<template>
  <div class="container">
    <div class="region" role="status" aria-live="polite" aria-atomic="false">
      <ul class="list">
        <li v-for="toast in remainingToasts" :key="toast.id" class="toast"
          :class="[`toast--${toast.kind}`, { sticky: toast.duration === 0 }]"
          @mouseenter="store.stopTimer(toast.id, 'hover')" @mouseleave="store.continueTimer(toast.id, 'hover')"
          @focusin="focusin($event, toast.id)" @focusout="focusout($event, toast.id)"
          @keydown="escape($event, toast.id)">{{
            toast.message }}<button type="button" @click="dismiss(toast.id)"
            :aria-label="`Dismiss: ${toast.message}`">x</button>
        </li>
      </ul>
    </div>
    <!-- role="alert" implies aria-atomic="true", which would re-read every visible error on each new one. -->
    <div class="region" role="alert" aria-live="assertive" aria-atomic="false">
      <ul class="list">
        <li v-for="toast in errorToasts" :key="toast.id" class="toast"
          :class="[`toast--${toast.kind}`, { sticky: toast.duration === 0 }]"
          @mouseenter="store.stopTimer(toast.id, 'hover')" @mouseleave="store.continueTimer(toast.id, 'hover')"
          @focusin="focusin($event, toast.id)" @focusout="focusout($event, toast.id)"
          @keydown="escape($event, toast.id)">{{
            toast.message }}<button type="button" @click="dismiss(toast.id)"
            :aria-label="`Dismiss: ${toast.message}`">x</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="css" scoped>
.container {
  --nb-ink: #000;
  --nb-paper: #fff;
  --nb-border: 3px solid var(--nb-ink);
  --nb-shadow: 6px 6px 0 var(--nb-ink);

  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: min(24rem, calc(100vw - 3rem));
  font-family: 'Space Grotesk', 'Arial Black', system-ui, sans-serif;
  /* let clicks pass through the empty space around toasts */
  pointer-events: none;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
 * Never hide an empty region with display:none / visibility:hidden: that drops it
 * from the accessibility tree and breaks the first announcement. An empty region
 * with no padding/border already takes no space; only add a gap between two
 * regions when both have toasts.
 */
.region:has(li)~.region:has(li) {
  margin-top: 1rem;
}

.toast {
  --toast-bg: #a5d8ff;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: var(--toast-bg);
  color: var(--nb-ink);
  border: var(--nb-border);
  border-radius: 0;
  box-shadow: var(--nb-shadow);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
  pointer-events: auto;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
}

.toast:hover,
.toast:focus-within {
  transform: translate(-2px, -2px);
  box-shadow: 8px 8px 0 var(--nb-ink);
}

.toast--info {
  --toast-bg: #a5d8ff;
}

.toast--success {
  --toast-bg: #b2f2bb;
}

.toast--error {
  --toast-bg: #ff8787;
  border-width: 4px;
}

.toast button {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  background: var(--nb-paper);
  color: var(--nb-ink);
  border: var(--nb-border);
  border-radius: 0;
  box-shadow: 3px 3px 0 var(--nb-ink);
  font: inherit;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    transform 80ms ease,
    box-shadow 80ms ease;
}

.toast button:hover {
  background: #ffd43b;
}

.toast button:active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--nb-ink);
}

.toast button:focus-visible {
  outline: 3px solid var(--nb-ink);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {

  .toast,
  .toast button {
    transition: none;
  }

  .toast:hover,
  .toast:focus-within {
    transform: none;
  }
}

.sticky {
  position: sticky;
  bottom: 0;
  left: 0;
}
</style>
