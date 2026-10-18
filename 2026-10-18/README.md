### **Daily Frontend Challenge: [Design Systems & Accessibility] Roving `tabindex` for a Tab List in Alpine.js**

> **Focus:** roving `tabindex` and arrow-key navigation for the ARIA tabs pattern · **Time box:** ~40 min
> **Format:** Inside an existing app · **Stack:** Alpine.js 3 (`alpinejs@3.17.4`) + TypeScript + Vite 8

#### **Overview**
The settings page below has a tab list that only works with a mouse: every tab is its own Tab stop, and the arrow keys do nothing. A keyboard user has to Tab through all four tabs to get past the widget. Your task is one change inside this app: make the tab list behave like a single composite widget, as the WAI-ARIA tabs pattern describes.

---

### **What You'll Learn**

**Core concept:** a composite widget is one Tab stop; focus inside it moves with arrow keys, and `tabindex` is "roving" so only the current item is focusable.

**By the end you should be able to:**
- explain why `tabindex="-1"` removes an element from the Tab order but still allows `.focus()`
- implement wrap-around arrow, Home and End navigation that skips disabled items
- distinguish the focused tab from the selected tab, and choose automatic or manual activation
- verify the behaviour with real keyboard events in the browser

**Skills practised:** roving tabindex · keyboard navigation · ARIA tabs · Alpine.js reactivity

**Prerequisites:** basic ARIA roles, `tabindex`, and how `KeyboardEvent.key` works.

**Where this shows up in practice:** tabs, toolbars, menus, radio groups and listboxes in every design system (Radix, React Aria, Headless UI, Angular CDK).

**Self-check (answer after solving):**
1. Why not simply give every tab `tabindex="0"`?
2. What happens when the user Tabs out of the list and back in: which tab should receive focus, and why?
3. Why is a disabled tab skipped by arrow keys here, while the ARIA pattern allows either choice?

---

### **Why Alpine.js?**
Alpine.js (2019) is a tiny library that sprinkles reactive behaviour onto server-rendered HTML through attributes such as `x-data` and `@click`, with no build step required. See the [official docs](https://alpinejs.dev).

---

### **Starter**
The project lives in `alpine-tabs/`. Run it with `cd alpine-tabs && npm install && npm run dev`.

`index.html` renders the tab list from the `tabs` component, and `src/main.ts` holds the component. Only the click behaviour exists:

```ts
Alpine.data("tabs", () => ({
  tabs,                // { id, label, content, disabled? }[]; "billing" is disabled
  selected: "profile",

  select(id: string) {
    this.selected = id;
  },

  // TODO: your work starts here.
}));
```

Each tab is a `<button role="tab">` bound to `:aria-selected`, `:disabled` and `@click="select(tab.id)"`. You may change both `index.html` and `src/main.ts`.

---

### **Detailed Requirements**
- Only the selected tab is in the Tab order (`tabindex="0"`); all others have `tabindex="-1"`.
- `ArrowRight` / `ArrowLeft` move focus to the next / previous enabled tab, wrapping at both ends. `Home` / `End` jump to the first / last enabled tab.
- Moving focus also selects the tab (automatic activation), and the matching panel is shown.
- Disabled tabs are never focused or selected by the keyboard.
- Handle keys on the tablist with a single listener. Call `preventDefault()` only for keys you handle, so `Tab` and browser shortcuts keep working.

### **Acceptance Criteria**
- Press `Tab` from the page start: the first Tab stop is "Profile"; the next `Tab` lands on "Help & support", not "Security".
- With "Profile" focused, `ArrowRight` focuses and selects "Security"; another `ArrowRight` skips "Billing" and lands on "Notifications"; one more wraps to "Profile".
- `Home` and `End` reach the first and last enabled tab; `ArrowLeft` on "Profile" wraps to "Notifications".
- After selecting "Security" with the keyboard, `Tab` away and `Shift+Tab` back: focus returns to "Security".
- Clicking a tab also updates which tab is the Tab stop.

---

### **Edge Cases & Performance Considerations**
- The disabled tab sits in the middle of the list, so "next" must skip it without an off-by-one at the wrap point.
- Focus must be moved after Alpine has rendered the new `tabindex` (hint: think about when the DOM updates).
- Stretch goal: add a `manual` activation mode where arrows move focus only and `Enter` / `Space` select.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite for the acceptance criteria.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
