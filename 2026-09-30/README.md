### **Daily Frontend Challenge: Svelte 5 Runes & Fine-Grained State Optimization**

#### **Overview**

With Svelte 5, reactivity shifted from top-level assignments to fine-grained signals driven by **Runes** (`$state`, `$derived`, `$effect`). When dealing with large arrays or deeply nested structures (like a tabular data grid or kanban board), naive `$state` mutations can trigger unnecessary re-renders across entire lists instead of targeting specific mutated items.

Your task is to build a type-safe, performant **Reactive List Engine** in TypeScript using Svelte 5 rune concepts (or raw signal primitives) that efficiently tracks granular updates to deeply nested list items without breaking reactivity or forcing bulk re-evaluations.

---

### **Detailed Requirements**

1. **State & Structure:**

- Define a generic list store holding items with a unique key: `{ id: string | number, data: T, isSelected: boolean }`.
- The store must allow targeted updates to individual fields within a single item (e.g., `updateItemField(id, key, value)`).

2. **Core API / Rune Methods:**

- `addItem(item: T)`: Inserts a new item into the collection.
- `updateField<K T extends keyof>(id: ID, field: K, value: T[K])`: Mutates a nested field while preserving signal proxy identity so that _only subscribers to that specific item/field react_.
- `derivedFilter(predicateFn)`: Returns a derived signal/runic output that re-computes _only when items matching the predicate change_, not when unrelated items update.

3. **Performance & Memory Constraints:**

- Updating item `#42` in a list of 10,000 items must execute in $O(1)$ time relative to list size.
- Component items subscribing to item `#1` must **not** re-render or re-evaluate when item `#42` changes.
- Ensure clean unsubscription / disposal of internal proxies when an item is removed from the collection to prevent memory leaks.

---

### **Key Edge Cases & Behavior to Consider**

- **Hydration / SSR Safety:** Ensure the store can be instantiated during SSR without accessing browser-only APIs or triggering top-level side effects before hydration.
- **Batching Rapid Field Updates:** If `updateField` is called 5 times synchronously within a single event loop tick, ensure derived getters collapse into a single reactivity pulse.
- **Deep Array/Object Replacements:** Ensure replacing an entire sub-array property on an item retains fine-grained tracking for untouched siblings.

---
