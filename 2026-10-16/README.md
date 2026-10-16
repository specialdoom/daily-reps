### **Daily Frontend Challenge: [CSS] A Reading Progress Bar with Zero JavaScript: Scroll-Driven Animations**

> **Focus:** binding an animation's progress to scroll position with `animation-timeline: scroll()` · **Time box:** ~40 min
> **Format:** HTML/CSS only · **Stack:** plain HTML + CSS (no JavaScript, no framework), Chromium 115+ / Safari 26+

#### **Overview**
Blog and docs sites show a thin bar that fills as you read. It is usually a `scroll` listener that writes to `style.width`, which runs on the main thread and janks under load. CSS scroll-driven animations let the browser tie a keyframe animation directly to scroll position, off the main thread. The task is to build the bar with CSS alone and handle the cases where the feature is missing or unwanted.

---

### **What You'll Learn**

**Core concept:** An animation's timeline does not have to be time. With `animation-timeline: scroll()`, the keyframes' 0%–100% map to the scroll offset of a scroll container instead of to a duration.

**By the end you should be able to:**
- Explain what `scroll()` selects (which scroller, which axis) and why `animation-duration` no longer controls the pace.
- Implement a progress bar with `@keyframes` and `animation-timeline: scroll(root block)`.
- Choose `animation-fill-mode` / `animation-timing-function` so progress is linear and correct at both ends.
- Gate the feature with `@supports` and `prefers-reduced-motion`.

**Skills practised:** scroll-driven animations · `@supports` · `transform` vs layout properties · reduced motion

**Prerequisites:** CSS `@keyframes`, `position: fixed`, custom properties.

**Where this shows up in practice:** reading progress on articles, sticky header shrink, parallax. Same idea as Framer Motion's `useScroll` or GSAP ScrollTrigger, but declarative and compositor-driven.

**Self-check (answer after solving):**
1. Why animate `transform: scaleX()` instead of `width`, and what does `transform-origin` have to do with it?
2. What happens to `animation-duration` when a scroll timeline is used? Why does `auto` matter here?
3. How would you track the progress of a nested scrolling container instead of the page?

---

### **Starter**
Create `index.html` and open it in a supported browser (no build step).

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Long read</title>
  <style>
    body { font: 1.125rem/1.7 system-ui, sans-serif; max-width: 40rem; margin: 0 auto; padding: 4rem 1rem; }
    p { margin: 0 0 1.5rem; }

    /* TODO: progress bar */
    .progress { }
  </style>
</head>
<body>
  <div class="progress" role="presentation"></div>
  <h1>A very long article</h1>
  <!-- Repeat this paragraph ~40 times so the page scrolls a lot -->
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
</body>
</html>
```

---

### **Detailed Requirements**
- `.progress` is fixed to the top of the viewport, full width, about 4px tall, using a visible colour.
- It starts empty at the top of the page and is exactly full at the bottom, growing linearly with scroll. No JavaScript.
- Use `animation-timeline: scroll(root block)` on a `@keyframes` that animates `transform: scaleX(0)` to `scaleX(1)` with `transform-origin: left`. Do not animate `width`.
- Set `animation-duration`, `animation-timing-function` and `animation-fill-mode` so the result is correct and linear.
- Wrap the animation in `@supports (animation-timeline: scroll())`. Without support, the bar must be hidden, not stuck full or empty.

### **Acceptance Criteria**
- Scroll to the top: bar invisible/empty. Scroll halfway (use DevTools to jump): bar about 50% wide. Bottom: fully filled.
- Scrolling back up shrinks the bar again, and the movement stays smooth with the main thread blocked (try a busy loop in the console).
- Resizing the window or adding more paragraphs needs no CSS change.
- With `prefers-reduced-motion: reduce` emulated in DevTools, the bar is not animated by scroll (hide it or show a static state; state which one you chose and why).
- Playwright idea: `page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))` then assert the computed `transform` matrix of `.progress` is `matrix(1, 0, 0, 1, 0, 0)`.

---

### **Edge Cases & Performance Considerations**
- Pages shorter than the viewport have no scroll range. Decide what the bar should show and check what the browser does.
- Easing: the default `ease` timing function would distort progress; confirm the bar tracks the thumb linearly.
- Confirm in the Performance panel that scrolling produces no layout or paint work for the bar.

**Stretch:** add a second bar at the bottom that tracks a horizontally scrolling code block with `scroll(nearest inline)`, or `scroll(self)`.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec or a finished reference `index.html`.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
