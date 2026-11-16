### **Daily Frontend Challenge: [Design Systems & Accessibility] One Tab Stop, Many Buttons: Roving `tabindex` in an Angular Toolbar**

> **Focus:** the roving `tabindex` focus model for `role="toolbar"` (one Tab stop, arrow keys move within, focus memory) · **Time box:** ~45 min
> **Format:** Component · **Stack:** Angular 22 (`@angular/core@22.2.6`, standalone, signals, zoneless) + TypeScript 6 + `@angular/build` (Vite-based)

#### **Overview**
A rich-text editor toolbar has a dozen buttons. If each is a Tab stop, a keyboard user must press Tab a dozen times to get past it. The WAI-ARIA pattern for toolbars (and tabs, menus, listboxes) is a *composite widget*: the whole widget is a single Tab stop and arrow keys move within it. The standard implementation is a **roving `tabindex`**.

---

### **What You'll Learn**

**Core concept:** exactly one item in a composite widget has `tabindex="0"` (the others `-1`), and that "active" index is state that must survive focus leaving and re-entering, and survive the item list changing.

**By the end you should be able to:**
- implement a roving `tabindex` driven by a signal rather than by imperative DOM mutation
- explain why `tabindex="-1"` items are still focusable programmatically but not by Tab
- handle disabled items and a changing item list without losing the single Tab stop
- verify the behaviour with the keyboard alone

**Skills practised:** roving tabindex · keyboard navigation · ARIA toolbar pattern · Angular signals

**Prerequisites:** basic Angular (standalone components, `input()`, signals); keyboard focus basics.

**Where this shows up in practice:** editor toolbars, tab lists, menus, radio groups, data-grid cells; the same idea exists in Radix/React Aria (`useRovingFocus`), Angular CDK (`FocusKeyManager`), and Headless UI.

**Self-check (answer after solving):**
1. Why is a roving `tabindex` usually preferable to `aria-activedescendant` for a toolbar of real `<button>`s?
2. What happens to the Tab order if *no* item has `tabindex="0"`? What if the active item becomes disabled?
3. When the user clicks a button with the mouse, should the "active" index change? Why?

---

### **Starter**
The starter lives in [`roving-toolbar/`](./roving-toolbar). Run it with:

```
cd roving-toolbar && npm install && npm run dev
```

It contains an `<app-toolbar>` (`src/app/toolbar.ts`) with `items` and `pressed` inputs and a `toggle` output, hosted in `src/app/app.ts` between two text inputs. Today every enabled button is its own Tab stop. The host has two buttons to disable "Link" and to remove the last item, so you can exercise the edge cases. Only edit `toolbar.ts`.

---

### **Detailed Requirements**
- **One Tab stop.** Exactly one *enabled* item has `tabindex="0"`; all others have `-1`. Tab from the "Title" input enters the toolbar on that item; the next Tab goes to the "Notes" input.
- **Arrow keys.** `ArrowRight`/`ArrowLeft` move focus to the next/previous enabled item and make it the active one. They wrap around at the ends. Prevent the default scroll.
- **Home / End** move to the first / last enabled item.
- **Focus memory.** Leaving the toolbar and Tabbing back lands on the last active item, not the first. Focusing an item (by click or programmatically) makes it the active one.
- Keep the active item as a **signal** (an item id, not an index) and bind `[attr.tabindex]` to it. Don't set `tabindex` imperatively.

### **Acceptance Criteria**
- With the keyboard only: Tab from "Title" → "Bold" is focused; Tab again → "Notes" is focused (the toolbar is skipped).
- Press `ArrowRight` twice from "Bold": focus skips the disabled "Underline" and lands on "Link". `ArrowRight` from "Code" wraps to "Bold". `End` focuses "Code"; `Home` focuses "Bold".
- Focus "Link", Tab out to "Notes", then Shift+Tab: focus returns to "Link".
- In DevTools, exactly one toolbar button has `tabindex="0"` at all times.

---

### **Edge Cases & Performance Considerations**
- **The active item becomes disabled** (use "Disable Link" while Link is active): the Tab stop must move to a nearby enabled item, not vanish.
- **The active item is removed** (focus "Code", then "Remove last item"): there must still be exactly one `tabindex="0"`.
- Don't call `focus()` in an effect on every render, as that steals focus from the page; move focus only in response to a key press.

**Stretch goal:** support `aria-orientation="vertical"` (`ArrowUp`/`ArrowDown` instead of left/right), still using the same active-id state.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec covering the acceptance criteria.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
