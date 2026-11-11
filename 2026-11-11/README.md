### **Daily Frontend Challenge: [CSS] One Card, Two Slots: Container Queries Instead of Media Queries**

> **Focus:** making a component respond to the width of its *slot* with `container-type: inline-size` + `@container` (and why a container can't query itself) · **Time box:** ~35 min
> **Format:** Component · **Stack:** Vue 3.5 (`vue@3.5.45`, `<script setup>`, scoped styles) + TypeScript + Vite 8

#### **Overview**
A product card is reused in a wide "featured" column and a narrow "related" sidebar. A viewport media query can't tell the two apart: on a 1400px screen both cards get the same layout. Design-system components need to adapt to the space they are *given*, which is what container queries solve.

---

### **What You'll Learn**

**Core concept:** An `@container` rule applies to descendants of the nearest ancestor with a `container-type`, never to the container itself. So a self-adapting component needs a wrapper (or an inner element) that is the container, and an inner element that is styled.

**By the end you should be able to:**
- explain why `container-type: inline-size` is required and what it implies (inline-size containment)
- choose where to put the container so the card queries its slot, not itself
- implement a layout switch at a width threshold and verify it by resizing a slot, not the window
- name a container (`container-name`) to avoid matching the wrong ancestor

**Skills practised:** CSS container queries · component-level responsiveness · Vue scoped styles

**Prerequisites:** CSS grid basics, Vue SFCs.

**Where this shows up in practice:** cards, widgets and dashboard tiles in design systems that are dropped into grids, sidebars and modals; the same applies in React/Svelte/Angular components.

**Self-check (answer after solving):**
1. Why can't `.card { container-type: inline-size }` plus `@container (min-width: 400px) { .card { … } }` restyle `.card`?
2. What breaks if the container has `container-type: size` and no explicit height?
3. How do Vue scoped styles interact with a wrapper element you add inside the component?

---

### **Starter**
Project: `card-slots/`. Run it with `cd card-slots && npm install && npm run dev`.

`App.vue` renders the same `ProductCard` in a flexible main column and a fixed 260px sidebar. `ProductCard.vue` currently always stacks the thumbnail above the text (see `card-slots/src/ProductCard.vue`).

---

### **Detailed Requirements**
- In `ProductCard.vue`, keep the props (`title`, `price`, `blurb`) and public API unchanged.
- When the card's slot is **at least 420px** wide, lay out the thumbnail on the left (fixed ~160px) and the text on the right (two columns).
- Below 420px, keep the current stacked layout.
- The decision must depend on the slot width only: resizing the window must not change a card whose slot width did not change.
- Give the container a name and reference it in the `@container` query.

### **Acceptance Criteria**
- At a 1200px+ viewport, the featured card is horizontal and the sidebar card is stacked.
- Narrowing the window until the main column drops below 420px switches the featured card to stacked, with no JS involved.
- Changing the sidebar width in `App.vue` to `460px` makes the sidebar card horizontal.
- The card still looks correct inside the container with no extra wrapper margin or double border.

---

### **Edge Cases & Performance Considerations**
- Inline-size containment means the container's width can't depend on its content: check the card doesn't collapse to 0 inside an auto-width parent (e.g. `display: inline-block` or a flex item without `min-width`).
- Make sure a nested container (a card inside a card) matches the intended one when queries are named.
- Stretch goal: use a *style query* or `@container style(--tone: warm)` to switch the thumbnail gradient without props.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec that resizes the slots and asserts the layout.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
