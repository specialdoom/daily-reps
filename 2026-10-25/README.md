### **Daily Frontend Challenge: [HTML & Semantics] Declarative Popover, Reactive State: Syncing `popover` with a Svelte `$bindable`**

> **Focus:** keeping a native `popover`'s open state and component state in sync in both directions (`toggle` event + `showPopover()` / `hidePopover()`) · **Time box:** ~40 min
> **Format:** Component · **Stack:** Svelte 5 (`svelte@5.57.2`, runes) + TypeScript + Vite 8

#### **Overview**
The Popover API gives you top-layer rendering, light dismiss (outside click, Esc) and focus restoration with just `popover` and `popovertarget`, no JavaScript. But the browser, not your component, now owns the open state. When the user dismisses the panel by clicking elsewhere, your framework state still says "open", and when the app wants to close or open it programmatically, the markup alone can't do it. A robust wrapper treats the DOM as the source of truth for user actions and the component state as the source of truth for app actions, without looping.

---

### **What You'll Learn**

**Core concept:** The browser mutates popover state behind your framework's back, so you mirror it via `toggle` events and drive it back via `showPopover()` / `hidePopover()`, guarding against feedback loops.

**By the end you should be able to:**
- Explain which interactions change popover state without any JavaScript (`popovertarget`, light dismiss, Esc) and which require the imperative API.
- Implement a two-way sync between a `$bindable` prop and the native popover state.
- Choose `toggle` over `beforetoggle`, and use `matches(":popover-open")` to read the current state.
- Verify that focus returns to the trigger and `aria-expanded` stays truthful.

**Skills practised:** Popover API · light dismiss · Svelte 5 runes (`$bindable`, `$effect`) · state synchronisation · ARIA state

**Prerequisites:** Basic Svelte 5 runes and the DOM event model.

**Where this shows up in practice:** Account menus, filter dropdowns and tooltips-with-content in design systems (Radix/Headless UI have the same "controlled vs. uncontrolled" problem; with the native API the browser plays the uncontrolled part).

**Self-check (answer after solving):**
1. Why can't you just set `open = !open` in an `onclick` on the trigger button? What does `popovertarget` already do?
2. Why does a naive `$effect` that calls `showPopover()` whenever `open` is true throw, or loop, after a light dismiss?
3. When would you pick `popover="manual"` instead of `"auto"`, and what would you lose?

---

### **Why Svelte 5?**   
Svelte 5 replaces the compiler-magic of `let`/`$:` with explicit runes (`$state`, `$bindable`, `$effect`), which makes two-way prop contracts like this one visible in the code. See the [Svelte docs on `$bindable`](https://svelte.dev/docs/svelte/$bindable).

---

### **Starter**
The project lives in [`popover-menu/`](popover-menu/). Run it with:

```bash
cd popover-menu && npm install && npm run dev
```

`src/Menu.svelte` renders a `popovertarget` button and a `popover="auto"` panel, but `open` is never updated. `src/App.svelte` binds `open`, shows its value, and has an outside "Open from outside" button plus a "Sign out" button inside the panel that sets it to `false`. Today the state text never changes and the two buttons do nothing useful. Only edit `Menu.svelte`.

(The CSS uses anchor positioning, so use a current Chromium or Safari 26+.)

---

### **Detailed Requirements**
- Do not add click handlers to the trigger: opening and closing by the button, Esc and outside click must remain native (`popovertarget`, `popover="auto"`).
- **DOM → state:** listen for the panel's `toggle` event and set `open = event.newState === "open"`. `aria-expanded` on the trigger must follow `open`.
- **State → DOM:** when the parent sets `open` (e.g. `accountOpen = true` or `false`), call `showPopover()` / `hidePopover()` on the panel in a `$effect`. Only call them when the DOM state differs (`panel.matches(":popover-open")`).
- Keep `Menu` generic: `label`, `open` and `children` remain the only props.
- No `any`; `svelte-check` must stay at 0 errors.

### **Acceptance Criteria**
- Click **Account**: the panel opens, the text says "open", the button reports `aria-expanded="true"`.
- Click outside or press Esc: the panel closes, the text says "closed", and focus is back on **Account**.
- Click **Open from outside**: the panel opens, and the text still says "open".
- Click **Sign out** inside the panel: the panel closes and the text says "closed".
- Opening and closing 10 times in a mixed order (button, Esc, outside, programmatic) never throws in the console and never gets stuck out of sync.

---

### **Edge Cases & Performance Considerations**
- Initial `open = true` from the parent: the panel must be visible on mount (hint: the element must exist before you can call `showPopover()`).
- Calling `showPopover()` on an already open popover throws an `InvalidStateError`; make sure the `toggle` handler and the effect can't trigger each other forever.
- Stretch goal: add a second `Menu` and confirm that opening one closes the other through the native `auto` behaviour, with both `open` values staying correct.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite for this component.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
