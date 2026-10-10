### **Daily Frontend Challenge: [CSS] A Card That Responds to Its Container, Not the Viewport**

> **Focus:** container queries on a custom element's `:host`, inside shadow DOM · **Time box:** ~45 min
> **Format:** Component · **Stack:** Lit 3 (`lit@3`) + TypeScript + Vite

#### **Overview**
A design system ships a `<product-card>` that is dropped into a 3-column grid, a narrow sidebar and a full-width hero. Viewport media queries can't tell those apart, so the card breaks in at least one of them. The card must adapt to the width it is *given*. This is the core use case for container queries, with a twist: the query container has to be the custom element itself, and the query rules live inside its shadow root.

---

### **Why Lit?**
Lit is a small library (~5 kB) for authoring standard Web Components with reactive properties and scoped styles via `static styles`, with no virtual DOM. Because the output is real custom elements with shadow DOM, it is a good way to practise style encapsulation rules. Docs: https://lit.dev/docs/

---

### **Starter**
Scaffold with `npm create vite@latest product-card -- --template lit-ts`, then use this element as the starting point. It renders the same content at every width:

```ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('product-card')
export class ProductCard extends LitElement {
  @property() name = '';
  @property() price = '';
  @property() image = '';
  @property() description = '';

  static styles = css`
    :host { display: block; }
    /* TODO */
  `;

  render() {
    return html`
      <article>
        <img src=${this.image} alt="" />
        <div class="body">
          <h3>${this.name}</h3>
          <p class="desc">${this.description}</p>
          <p class="price">${this.price}</p>
          <slot name="actions"></slot>
        </div>
      </article>
    `;
  }
}
```

And a demo page that renders three cards side by side in a resizable wrapper:

```html
<div style="resize: horizontal; overflow: auto; width: 700px; border: 1px dashed">
  <product-card name="Trail Shoe" price="$120" image="/shoe.jpg"
                description="Light, grippy, waterproof.">
    <button slot="actions">Add to cart</button>
  </product-card>
</div>
```

---

### **Detailed Requirements**
- Make the card a size container: `:host { container-type: inline-size; }` (and a `container-name`). Explain in a comment why `display: block` on `:host` is required for this to work.
- Three layouts driven only by `@container` rules, with **no `@media` and no JavaScript resize logic**:
  - **< 280px:** stacked. Image on top (16:9), description hidden, price and actions in one column.
  - **280px – 479px:** stacked, description visible, price and actions on one row.
  - **≥ 480px:** horizontal. Image on the left (40% width, square), content on the right.
- Resizing the wrapper (drag the handle) must switch layouts live. Putting two cards of different widths on one page must give each its own layout.
- The title must scale with the container using container query units (`cqi`) with a sensible `clamp()`, not `vw`.
- Rules for the card's inner elements must be declared in the shadow root's styles. The host itself cannot be styled by a query on itself, so style an inner wrapper (`article`) for layout changes.

### **Acceptance Criteria**
- In the browser, dragging the wrapper from 200px to 800px shows all three layouts with no reload.
- Two cards in containers of 250px and 600px render different layouts at the same time.
- Playwright check: set the wrapper to 250px, 400px and 600px and assert `article`'s computed `flex-direction` (or `grid-template-columns`) and the visibility of `.desc` for each.
- Searching the stylesheet for `@media` returns nothing.

---

### **Edge Cases & Performance Considerations**
- A container with `container-type: inline-size` can't size itself from its content's width. What happens in a `display: inline-block` or `flex` parent with no explicit width, and how do you make the card still render sensibly (e.g. `width: 100%` / `min-width`)?
- A container query can't style the container element itself. Where does that bite you here, and how does the wrapper element avoid it?
- Resizing should not cause layout thrash from JavaScript: confirm in DevTools Performance that no script runs during a drag.

*Stretch:* let consumers override the breakpoints from outside via CSS custom properties, and explain why custom properties can't be used inside the `@container` condition itself.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite, or a starter project.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
