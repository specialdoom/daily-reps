### **Daily Frontend Challenge: [Framework Mechanics & State Primitives] The Cart Badge That Stays at 0: Subscribing to an External Store**

> **Focus:** subscribing React to an external store correctly with `useSyncExternalStore` · **Time box:** ~40 min
> **Format:** Debug / review · **Stack:** React 19 (`react@19.3.1`) + TypeScript + Vite 8

#### **Overview**
Your app keeps its cart in a tiny framework-agnostic store, and a hand-rolled `useStore` hook (`useState` + `useEffect`) connects it to React. In production the header badge sometimes shows `🛒 0` and the total `$0.00` right after load, even though the cart holds three items. Clicking "Add item" suddenly fixes everything. Find the root cause and fix the hook.

---

### **What You'll Learn**

**Core concept:** React can only react to an external store if it reads the current value *and* subscribes in a way that cannot miss a change between render and subscription. `useSyncExternalStore` exists to guarantee exactly that.

**By the end you should be able to:**
- Explain the order of render, layout effects and passive effects, and where the store change slips through.
- Replace a `useState` + `useEffect` subscription with `useSyncExternalStore`.
- State the contract for `getSnapshot` (referentially stable between changes) and why violating it causes warnings or infinite loops.
- Choose between a plain store hook and a selector that returns a primitive.

**Skills practised:** React effect timing · external stores · `useSyncExternalStore` · tearing and concurrent rendering · debugging stale UI

**Prerequisites:** `useState`, `useEffect`, `useLayoutEffect`, and basic pub/sub.

**Where this shows up in practice:** the primitive underneath Redux, Zustand, Jotai and TanStack Query bindings; Vue and Svelte get the same guarantee from their reactivity systems for free.

**Self-check (answer after solving):**
1. Why is the update lost? Which effect phase runs first, and who is listening at that moment?
2. Why does `useSyncExternalStore` need both `subscribe` and `getSnapshot`, and what does React do right after subscribing?
3. What happens if `getSnapshot` returns a new object on every call, and how would you expose only `items` safely?

---

### **Starter**
The project lives in [`cart-badge/`](./cart-badge): `cd cart-badge && npm install && npm run dev`.

`src/useStore.ts` (the hook under review):

```ts
export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState(store.get());

  useEffect(() => {
    return store.subscribe(() => setValue(store.get()));
  }, [store]);

  return value;
}
```

`src/main.tsx` renders `CartBadge` and `CartTotal` (both use `useStore(cartStore)`), plus a `RestoreCart` component that calls `cartStore.set({ items: 3, total: 59.97 })` inside `useLayoutEffect` on mount. The store itself (`src/store.ts`) is correct; do not change it.

**Symptoms:** on load, the badge shows `0` and the total `$0.00`. After "Add item" they jump to `4` and `$79.96`.

---

### **Detailed Requirements**
- Write down the root cause in one or two sentences (put it in a comment above the hook).
- Fix `useStore<T>(store): T` so the badge and total show `3` and `$59.97` on first paint, without changing `store.ts` or `RestoreCart`.
- Use `useSyncExternalStore`; no extra `useState`/`useEffect`.
- Add `useStoreSelector<T, S>(store, select: (state: T) => S): S` for primitive selections and use it in `CartBadge` (`items`) and `CartTotal` (`total`).

### **Acceptance Criteria**
- After a hard reload, the page shows `🛒 3` and `Total: $59.97` immediately, with no flash of `0`.
- Clicking "Add item" updates both the badge and the total to `4` and `$79.96`.
- No React warnings in the console (e.g. about `getSnapshot` being uncached).
- `npm run build` passes.

---

### **Edge Cases & Performance Considerations**
- A selector that returns a fresh object (`s => ({ items: s.items })`) must not cause an infinite render loop or warning. Explain why, or restrict the hook to stable values.
- A component that unmounts must not leak its listener (check `listeners.size` in the console or a debugger).
- Stretch: a store change that happens between the first render and the subscription of a *lazily mounted* component (e.g. behind `Suspense`) must still be seen.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite that reproduces the stale badge and checks the fix.
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
