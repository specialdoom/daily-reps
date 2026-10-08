### **Daily Frontend Challenge: [Design Systems & Accessibility] Toast Queue with a Reliable Live Region**

> **Focus:** screen-reader announcements via a persistent `aria-live` region · **Time box:** ~45 min
> **Format:** Component · **Stack:** Vue 3.5 (Composition API, `<script setup>`) + TypeScript + Vite + Vitest + @vue/test-utils

#### **Overview**
Every design system ships a toast, and most of them are silent for screen-reader users: the live region is mounted at the same moment as the message, so nothing is announced. Your job is to build a toast host whose announcements are reliable, polite by default, and never spammy, while keeping the visual stack tidy.

---

### **Starter**
Provided composable API (you implement the component and the store):

```ts
export type ToastKind = 'info' | 'success' | 'error';

export interface ToastInput {
  message: string;
  kind?: ToastKind;      // default 'info'
  duration?: number;     // ms, default 5000; 0 = sticky
}

export interface Toast extends Required<ToastInput> {
  id: number;
}

export function useToasts(): {
  toasts: Readonly<Ref<readonly Toast[]>>;
  push(input: ToastInput): number;   // returns id
  dismiss(id: number): void;
};
```

You write `<ToastHost />`, which renders `toasts` from a module-level store (shared across callers of `useToasts`).

---

### **Detailed Requirements**
- `<ToastHost />` renders a **persistent** container that exists in the DOM before the first toast is pushed (otherwise assistive tech will not announce the first message). Use `role="status"` + `aria-live="polite"` + `aria-atomic="false"` for `info`/`success`.
- `error` toasts must be announced assertively: render them into a **second, separate persistent** region with `role="alert"` (`aria-live="assertive"`). Do not toggle `aria-live` on one element dynamically.
- Visible toasts auto-dismiss after `duration`. Hovering or focusing inside a toast pauses its timer; leaving resumes with the **remaining** time, not a full restart. `duration: 0` is sticky.
- Each toast has a dismiss `<button>` with an accessible name that includes the message (e.g. `Dismiss: Saved`). Pressing `Escape` while focus is inside a toast dismisses it and moves focus to the previous focusable element it came from (or `document.body` if none).
- Identical `message` + `kind` pushed while one is already visible must not create a duplicate; instead restart that toast's timer and return the existing id.

### **Acceptance Criteria (Vitest + @vue/test-utils, fake timers)**
- On mount with zero toasts, both live regions exist in the DOM and are empty.
- Pushing `{ message: 'Saved', kind: 'success' }` places the text inside the polite region only; an `error` places it inside the assertive region only.
- Advancing 4000 ms, hovering for 3000 ms, then leaving: the toast disappears after a further ~1000 ms, not 5000 ms.
- Pushing the same message twice yields one DOM node and the same id.
- `Escape` on a focused toast removes it and restores focus.

---

### **Edge Cases & Performance Considerations**
- Pushing 50 toasts in one tick: cap the *visible* stack at 3 (queue the rest FIFO), and make sure queued messages are not announced until they become visible.
- Dismissing a toast while its timer is paused must clear the timer (no leaks, no callbacks after unmount).
- Stretch goal: respect `prefers-reduced-motion` for the enter/leave transition without delaying DOM removal.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite or a starter project.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
