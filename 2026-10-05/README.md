### **Daily Frontend Challenge: [HTML & CSS] JavaScript-Free Anchored Menu with `popover` and CSS Anchor Positioning**

> **Focus:** native `popover` + CSS anchor positioning with fallback flipping · **Time box:** ~45 min
> **Format:** HTML/CSS only · **Stack:** plain HTML + CSS (no JavaScript, no framework)

#### **Overview**
Dropdown menus are traditionally built with a JS positioning library, click-outside listeners and Escape handlers. Modern browsers now do all three natively: the Popover API gives you top-layer rendering, light dismiss and Escape handling, and CSS anchor positioning attaches the menu to its trigger and flips it when it would overflow the viewport. Build an "actions" menu that uses only these primitives.

---

### **Starter**
Save as `index.html`. The page is given; you write the CSS and add the popover attributes.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Anchored menu</title>
  <style>
    /* your CSS here */
  </style>
</head>
<body>
  <main>
    <h1>Invoices</h1>
    <ul class="rows">
      <li>
        <span>INV-1001</span>
        <button class="actions-btn">Actions</button>
        <div class="menu">
          <button>Download PDF</button>
          <button>Send reminder</button>
          <button>Void invoice</button>
        </div>
      </li>
      <!-- repeat the <li> 20 times so the page scrolls; every row has its OWN menu -->
    </ul>
  </main>
</body>
</html>
```

---

### **Detailed Requirements**
- **No JavaScript.** Open/close must work through the `popover` and `popovertarget` attributes only (use `popover="auto"` semantics).
- Each row's button opens *its own* menu. The menu must be tethered to *its* button using CSS anchor positioning (`anchor-name`, `position-anchor`, `position-area` or `anchor()`), not hard-coded offsets. With 20 rows you cannot use one shared `anchor-name` in a way that makes every menu snap to the last button, so scope the names per row (hint: `anchor-scope`, or a unique inline `style="anchor-name: --row-N"` per row).
- By default the menu appears **below** the button, left edges aligned, with an 8px gap.
- When there isn't enough room below (rows near the bottom of the viewport), the menu must **flip above** the button automatically using `position-try-fallbacks`, with no scripting.
- Give the menu an entry animation (fade + slight translate) that also works on open from `display: none`, using `@starting-style` and `transition-behavior: allow-discrete`. Respect `prefers-reduced-motion`.
- Markup must be semantically sound: the trigger is a real `<button>`, and you add the right roles/attributes so the open state is exposed (hint: what does `popovertarget` already expose, and what would you still add for a menu?).

### **Acceptance Criteria**
- Clicking "Actions" on row 3 opens only row 3's menu, directly under that button.
- Clicking elsewhere on the page, or pressing **Esc**, closes it; focus returns to the trigger.
- Opening another row's menu closes the first (light dismiss with `popover="auto"`).
- Scroll so a row sits at the bottom edge of the viewport, then open it: the menu appears above the button and never gets clipped. Resize the window to confirm it flips back.
- The menu is not clipped by an ancestor with `overflow: hidden` (add one to `.rows` to verify why top-layer matters).
- Optional Playwright check: click the trigger, assert the menu `:popover-open` and that `menu.boundingBox().y > button.boundingBox().y` for a top row and `<` for a bottom row.

---

### **Edge Cases & Performance Considerations**
- **Browser support:** anchor positioning ships in Chromium 125+ and Safari 26; wrap your positioning in `@supports (anchor-name: --a)` and decide what the fallback looks like (e.g. the menu centred as a plain popover). State your choice in a comment.
- **Name collisions:** 20 identical anchor names all resolve to one anchor. Explain in a comment why your scoping fixes it.
- **Horizontal overflow:** if the button is at the far right edge, the menu should also flip horizontally (add a second `@position-try` option).
- **Stretch:** add a small arrow that points at the button, positioned with `anchor()` so it follows the flip.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec or a reference solution.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
