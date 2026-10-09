### **Daily Frontend Challenge: [Framework Mechanics & State Primitives] Undo/Redo over Deep `$state` with `$state.snapshot`**

> **Focus:** snapshotting deeply reactive Svelte 5 state into an undo/redo history · **Time box:** ~45 min
> **Format:** Small app · **Stack:** Svelte 5 (`svelte@5.57`) + TypeScript + Vite 7 (`@sveltejs/vite-plugin-svelte@5`)

#### **Overview**
A form builder, whiteboard or settings editor needs undo/redo, and in Svelte 5 the state is a deep `$state` proxy. Pushing that proxy into a history array is a classic trap: every "snapshot" is the same live object, so undo does nothing, and `structuredClone(proxy)` throws. You're building a tiny undo/redo layer that records real, immutable snapshots of deep reactive state, and restores them without breaking reactivity.

---

### **Why Svelte 5?**
Svelte 5 replaced the compile-time `let` magic with explicit runes (`$state`, `$derived`, `$effect`), where `$state` objects are deeply reactive proxies. That makes "what is a value and what is a live reference?" a question you must answer yourself. Docs: [svelte.dev/docs/svelte/$state](https://svelte.dev/docs/svelte/$state).

---

### **Starter**
Scaffold with `npm create vite@latest undo -- --template svelte-ts`, then use this state and component shell. The editor is a list of cards, each with a title and a list of tags.

```ts
// src/lib/types.ts
export type Card = { id: number; title: string; tags: string[] };
export type Board = { name: string; cards: Card[] };
```

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import type { Board } from './lib/types';
  import { createHistory } from './lib/history.svelte';

  let board: Board = $state({
    name: 'Sprint',
    cards: [{ id: 1, title: 'Write tests', tags: ['qa'] }],
  });

  // TODO: wire this to `board` (see requirements)
  const history = createHistory(/* ... */);
  let nextId = 2;
</script>

<input bind:value={board.name} aria-label="Board name" />
<button onclick={() => board.cards.push({ id: nextId++, title: 'New card', tags: [] })}>Add card</button>
<button onclick={history.undo} disabled={!history.canUndo}>Undo</button>
<button onclick={history.redo} disabled={!history.canRedo}>Redo</button>

{#each board.cards as card (card.id)}
  <div>
    <input bind:value={card.title} aria-label="Card title" />
    <button onclick={() => card.tags.push('new')}>Tag</button>
    <span>{card.tags.join(', ')}</span>
  </div>
{/each}
```

---

### **Detailed Requirements**
Implement `src/lib/history.svelte.ts`:

```ts
export function createHistory<T extends object>(
  state: T,
  options?: { limit?: number }, // default 50
): {
  commit(): void;       // record the current state as a new history entry
  undo(): void;
  redo(): void;
  readonly canUndo: boolean; // reactive
  readonly canRedo: boolean; // reactive
};
```

- On creation, record the initial state as the first entry. `commit()` stores `$state.snapshot(state)`, never the proxy, so later mutations can't alter old entries.
- `undo()` / `redo()` move through entries and restore that entry **into the same `state` object in place** (the variable in `App.svelte` is not reassigned, so bindings keep working). Restore from a fresh copy so that mutating the restored state doesn't corrupt the stored entry.
- `canUndo` / `canRedo` must be reactive (use `$state` or `$derived` inside the `.svelte.ts` module) so the buttons enable and disable correctly.
- `commit()` after an undo discards the redo branch. History never exceeds `limit` entries: drop the oldest first.
- Call `commit()` from the app after meaningful edits (add card, add tag, rename on `change`, not on every keystroke). Don't use `$effect` to auto-commit: it would also fire on restore and record undo steps as new edits.

### **Acceptance Criteria**
- Add a card, then Undo: the card disappears and the Redo button becomes enabled.
- Type a new board name, blur the field, Undo: the previous name returns and the input shows it.
- After undoing, edit a card's title and commit: Redo is disabled again.
- Undo, then mutate the restored board (e.g. add a tag), then Undo and Redo through the older entries: they show their original contents, unaffected by that mutation.
- After 60 commits, only the last 50 states are reachable and Undo disables at the oldest.

---

### **Edge Cases & Performance Considerations**
- `undo()` at the oldest entry and `redo()` at the newest are no-ops, not errors.
- State containing `Date`, `Map` or class instances: say what `$state.snapshot` does with them, and what that means for restoring.
- Stretch: store structural-sharing diffs instead of full snapshots, to cut memory on large boards.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite or a Playwright spec for the criteria above.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
