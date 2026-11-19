### **Daily Frontend Challenge: [CSS] Ending the Specificity War: Cascade Layers vs. a Third-Party Stylesheet**

> **Focus:** using `@layer` to decide which stylesheet wins, regardless of selector specificity (and why unlayered styles beat layered ones) · **Time box:** ~35 min
> **Format:** HTML/CSS only · **Stack:** plain HTML + CSS (no JavaScript, no framework), any evergreen browser

#### **Overview**
Your app loads a third-party UI kit whose selectors are long (`.page .actions button.btn.btn-danger`). Your own one-class rule `.btn-brand` loses to it, so the team has been adding `!important` and doubled selectors (`.btn.btn-brand.btn-brand`). Cascade layers let you declare *which source wins*, so specificity inside a layer stops mattering across layers.

---

### **What You'll Learn**

**Core concept:** Cascade order is decided by layer *before* specificity: for normal declarations, a later layer beats an earlier one, and unlayered styles beat every layer. Specificity only breaks ties within the same layer.

**By the end you should be able to:**
- declare an explicit layer order with `@layer a, b, c;`
- import a third-party stylesheet into a layer with `@import url(...) layer(name)` or `<link>` + wrapping
- explain why a one-class rule in a later layer beats a four-selector rule in an earlier one
- explain how `!important` reverses the layer order

**Skills practised:** cascade layers · specificity · cascade origin and order · CSS architecture

**Prerequisites:** selector specificity, how `<link>` order affects the cascade.

**Where this shows up in practice:** design systems that must override a vendor kit, Tailwind v4 (`@layer theme, base, components, utilities`), resets that must always lose.

**Self-check (answer after solving):**
1. Why does an unlayered `a { color: red }` beat `@layer base { a#nav.link { color: blue } }`?
2. With `!important` declarations, which layer wins: the earlier or the later one? Why was it designed that way?
3. Why can't a `<link rel="stylesheet">` be placed into a layer directly, and what are the two ways around it?

---

### **Starter**
Project: `layer-war/` (static, no install). Open `layer-war/index.html` in a browser, or run `cd layer-war && npx serve .`.

- `vendor.css` is the third-party kit. Treat it as **read-only** (no edits, no copies).
- `app.css` holds your styles, and currently the "Upgrade plan" button looks like a vendor button.
- `index.html` may be edited only to change how the stylesheets are linked.

---

### **Detailed Requirements**
- Declare the layer order `vendor, app` once, at the top of `app.css`.
- Put the vendor kit into the `vendor` layer without modifying `vendor.css`.
- Put your rules in the `app` layer so that `.btn-brand` wins on background, colour, border, radius and padding.
- No `!important` in your code and no selector longer than one class.
- The vendor `.btn:hover { background: … !important }` rule is a vendor `!important`: decide, and document in a CSS comment, how it interacts with your layers.

### **Acceptance Criteria**
- "Upgrade plan" renders indigo with white text and an 8px radius; the other two buttons still look like the vendor kit.
- DevTools shows the vendor rules grouped under the `vendor` layer and yours under `app`.
- Swapping the order to `@layer app, vendor;` makes the brand button lose again (verify, then revert).
- Hover on a vendor button still shows the vendor hover colour.

---

### **Edge Cases & Performance Considerations**
- Unlayered styles always win over layered ones: check that no stray unlayered rule in `app.css` accidentally overrides your intended layer order.
- `@import … layer()` blocks parallel loading when used in CSS; consider the `<link>` approach plus a layer-declaring `@import`-free alternative, and say what you chose.
- Stretch goal: add a third layer `reset` that must always lose, and place it first.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec that checks computed styles.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
