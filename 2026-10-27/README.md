### **Daily Frontend Challenge: [Design Systems & Accessibility] A CSS-Only Switch That Keeps Its Keyboard Focus and Survives Forced Colors**

> **Focus:** styling a native `<input type="checkbox" role="switch">` through its sibling (visually hidden input, `:checked`, `:focus-visible`, `forced-colors`) · **Time box:** ~40 min
> **Format:** HTML/CSS only · **Stack:** plain HTML + CSS (no JavaScript, no framework)

#### **Overview**
Design systems love custom toggles, and the classic shortcut is `input { display: none }` plus a styled `<span>`. That removes the control from the keyboard order and the accessibility tree, so the "switch" works with a mouse and nothing else. You'll keep the native input as the source of truth and make the visuals follow it.

---

### **What You'll Learn**

**Core concept:** a custom control must be a *styled native control*, not a replacement for one. Hide the input visually, never from rendering, and derive every visual state from its pseudo-classes.

**By the end you should be able to:**
- explain why `display: none` and `visibility: hidden` break keyboard access and screen-reader support, while a visually-hidden input does not
- implement checked, focus-visible and disabled states using only `:checked`, `:focus-visible`, `:disabled` and sibling selectors
- verify the control in `forced-colors: active` using system colors
- choose `:focus-visible` over `:focus` and justify it

**Skills practised:** native-first components · `:focus-visible` · visually-hidden pattern · forced colors / system colors · `prefers-reduced-motion`

**Prerequisites:** CSS selectors (sibling combinators), basic ARIA roles

**Where this shows up in practice:** switches, checkboxes and radio cards in every design system (Radix, Material, GOV.UK); the same pattern applies in any framework.

**Self-check (answer after solving):**
1. Why does `display: none` on the input make the switch unreachable by Tab, even though the label is still clickable?
2. Why does a background-color-only "on" state disappear in forced-colors mode, and which properties does the browser keep?
3. When would `:focus` show a ring that `:focus-visible` hides, and is that what you want here?

---

### **Starter**

The starter lives in [`switch/index.html`](./switch/index.html). Open it directly in a browser (no build step). It currently renders two switches, but the input is `display: none`, nothing shows the checked state, and there is no focus indicator.

Keep the markup structure (`label > input + .track`). You may add a class or two, but don't add JavaScript and don't remove `role="switch"`.

---

### **Detailed Requirements**
- Replace `display: none` with a visually-hidden technique that keeps the input focusable and in the accessibility tree (e.g. `position: absolute; opacity: 0; inline-size/block-size` covering the track, or the clip pattern). Clicking the track must still toggle it.
- Checked state: `.track` changes background and the thumb slides to the end, driven only by `input:checked + .track`. Use logical properties/`inset-inline-start` so it also works in `dir="rtl"`.
- Disabled state: dimmed, `cursor: not-allowed`, and visibly different from "off" (the second switch is checked *and* disabled).
- Transitions must be disabled under `prefers-reduced-motion: reduce`.
- Under `@media (forced-colors: active)` the on/off states and the focus ring must remain distinguishable using system colors (`Canvas`, `CanvasText`, `Highlight`, `GrayText`).

### **Acceptance Criteria**
- Tab from the page start lands on the first switch; Space toggles it; a visible focus ring appears **only** for keyboard focus, not on mouse click.
- The disabled switch is skipped by Tab and reads as disabled and on.
- With Chromium/Edge DevTools → Rendering → "Emulate CSS media feature forced-colors: active", on vs off and the focus ring are still distinguishable.
- With a screen reader (or the accessibility tree in DevTools) each switch exposes role `switch`, its name ("Product updates") and its on/off state.
- Setting `dir="rtl"` on `<html>` moves the thumb correctly.

---

### **Edge Cases & Performance Considerations**
- Forced colors drops `background-color` on most elements: encode the "on" state with something that survives (border, thumb position, or a `forced-color-adjust`-aware color).
- A focus ring drawn with `outline` on the hidden input is invisible; it must be drawn on `.track` via `input:focus-visible + .track`.
- Touch target: the clickable area should be at least 44×44 CSS px without shifting the layout.

**Stretch:** add a `:has()`-based variant so the whole `.switch` row highlights when its input is focused.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite (keyboard toggle, focus-visible vs mouse, forced-colors emulation).
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
