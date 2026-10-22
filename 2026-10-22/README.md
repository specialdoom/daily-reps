### **Daily Frontend Challenge: [CSS] Same Card, Three Widths: Container Queries Instead of Media Queries**

> **Focus:** making a component respond to its container's width with `container-type: inline-size` and `@container` · **Time box:** ~40 min
> **Format:** Component · **Stack:** Vue 3.5 (`vue@3.5.44`, `<script setup>` + scoped styles) + TypeScript + Vite 8

#### **Overview**
A product card is reused in a narrow sidebar, a wide main column and an auto-fill grid. It switches layout with a viewport `@media` query, so on a wide screen the card in the 16rem sidebar tries to render its horizontal layout and overflows. Components should adapt to the space they are given, not to the window.

---

### **What You'll Learn**

**Core concept:** a container query lets a component pick its layout from the width of its nearest query container, so the same markup works in any slot.

**By the end you should be able to:**
- Declare a query container and explain why the container itself can't be styled by its own query.
- Replace a viewport breakpoint with an `@container` rule and verify it in three different slots.
- Use container query units (`cqi`) for fluid sizing inside the container.
- Choose where `container-type` belongs so the component stays reusable.

**Skills practised:** container queries · `container-type` · `cqi` units · component-level responsive CSS · Vue scoped styles

**Prerequisites:** CSS grid basics; reading a Vue single-file component.

**Where this shows up in practice:** design-system cards, dashboard widgets and CMS blocks that live in layouts the author doesn't control. Tailwind exposes the same feature as `@container` / `@md:` variants.

**Self-check (answer after solving):**
1. Why can't an element's own `@container` rule change that same element's width-dependent layout?
2. What does `container-type: inline-size` do to the container's own sizing, and what breaks if you apply it to an element that relies on its children for its width?
3. Where does a `cqi` unit resolve when no ancestor is a query container?

---

### **Starter**
The project lives in `product-card/`:

```
cd product-card && npm install && npm run dev
```

`ProductCard.vue` renders one card and `App.vue` places it in a 16rem sidebar, a main column and a grid of four cards. The card's current breakpoint:

```css
@media (min-width: 700px) {
  .card { grid-template-columns: 12rem 1fr; }
  .card__blurb { font-size: 1rem; }
}
```

Open it in a window wider than 700px: every card, including the ones in the sidebar and the narrow grid cells, switches to the two-column layout and gets squeezed.

---

### **Detailed Requirements**
- Remove the viewport `@media` rule from `ProductCard.vue`.
- Make the card's slot a query container (`container-type: inline-size`). Decide whether the wrapper lives in `ProductCard.vue` or in the parent, and keep the component reusable without extra parent CSS.
- Below `30rem` of container width the card stacks (image on top). At `30rem` and above it uses `grid-template-columns: 10rem 1fr`.
- At `45rem` and above the blurb font size grows, and the image gets a larger column (`16rem`).
- Make the title size fluid with a container query unit, clamped between `1rem` and `1.5rem`.
- No JavaScript changes, no `ResizeObserver`.

### **Acceptance Criteria**
- At a 1400px viewport, the sidebar card is stacked, the grid cards are stacked, and the main-column card is two-column.
- Resizing the window never changes a card's layout unless that card's own container width crosses a threshold.
- Changing the sidebar width in `style.css` to `32rem` makes the sidebar card switch to two columns with no component edit.
- The card has no horizontal overflow at any width down to 12rem of container width.
- Playwright check: set the viewport to 1400×900, then assert the `grid-template-columns` computed on the first and last `.card`.

---

### **Edge Cases & Performance Considerations**
- **Self-targeting:** a container can only be queried by its descendants, so the element that gets `container-type` can't be `.card` itself if `.card` is the thing being restyled.
- **Size containment:** `inline-size` containment means the container's inline size can't depend on its content. Check it still fills its grid cell correctly.
- **Nesting:** if the card is itself placed inside another named container, a named container (`container-name`) keeps queries unambiguous.

*Stretch goal:* give the container a name and write the thresholds as range syntax (`@container card (30rem <= width < 45rem)`).

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec that checks the layout in each slot.
- **(B)** Paste your solution for a review of correctness, edge cases and accessibility.
