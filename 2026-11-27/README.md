### **Daily Frontend Challenge: [Design Systems & Accessibility] "Settings Saved" That Nobody Hears: A Persistent ARIA Live Region**

> **Focus:** live regions must exist *before* their content changes · **Time box:** ~40 min
> **Format:** Small app · **Stack:** Vue 3.5 (`vue@3.5.45`, `<script setup>`) + TypeScript + Vite 8 (`vite@8.3.5`)

#### **Overview**
Your design system ships a toast component. Sighted users see "Settings saved"; screen-reader users report that it is announced only sometimes, and never when they click Save twice in a row. Fix the announcement path so status messages are reliable, without announcing everything twice.

---

### **What You'll Learn**

**Core concept:** assistive tech announces *changes inside* an existing live region. A region that is inserted into the DOM together with its text is often missed, and setting identical text again is not a change.

**By the end you should be able to:**
- Explain why `v-if` on the element carrying `aria-live` makes announcements unreliable.
- Implement a single always-mounted announcer with polite and assertive channels.
- Make a repeated identical message announce again.
- Avoid double announcements by separating the visual toast from the spoken message.

**Skills practised:** ARIA live regions · `role="status"` vs `role="alert"` · Vue composables · design-system a11y

**Prerequisites:** basic Vue and ARIA roles.

**Where this shows up in practice:** toast libraries (Radix Toast, Sonner), form-error summaries, "Saved" indicators, `aria-live` announcers in Angular CDK (`LiveAnnouncer`) and React Aria.

**Self-check (answer after solving):**
1. Why is a live region that is created already containing its message unreliable?
2. When is `assertive` justified, and what does it cost the user?
3. Why must the visual toasts be hidden from the accessibility tree once you have an announcer?

---

### **Starter**
Project: `live-announcer/`. Run: `cd live-announcer && npm install && npm run dev`.

`src/Toaster.vue` currently renders visual toasts inside `<div v-if="toasts.length" role="status" aria-live="polite">`. `src/App.vue` has a Save and a Simulate failure button that call `pushToast`.

---

### **Detailed Requirements**
- Create `src/announcer.ts` exporting `announce(message: string, politeness?: "polite" | "assertive"): void` (default `"polite"`), and `src/LiveRegion.vue` rendering two **always-mounted** regions: `role="status"` (polite) and `role="alert"` (assertive), visually hidden but not `display: none`.
- Mount `<LiveRegion />` once in `App.vue`. Make `pushToast` also call `announce` (errors assertive, successes polite).
- Remove `role`/`aria-live` from the toast container and mark the visual toasts `aria-hidden="true"` so nothing is read twice.
- Announcing the same message twice in a row must be announced both times.
- No `any`; the announcer's state must be typed.

### **Acceptance Criteria**
- In devtools, both live regions exist in the DOM from page load and are never removed.
- Clicking Save: the polite region's text becomes "Settings saved"; the alert region stays empty. Clicking Simulate failure fills only the alert region.
- Clicking Save twice quickly changes the DOM text between the two announcements (so a screen reader has a change to announce).
- The toast elements are not exposed in the accessibility tree (check in the devtools Accessibility pane).
- With a screen reader, each click is spoken exactly once.

---

### **Edge Cases & Performance Considerations**
- Identical consecutive messages: clearing and re-setting in the same tick is coalesced; you need a short delay, or an alternating invisible suffix.
- Several messages in quick succession: decide whether the last one wins or they queue, and justify it.
- Stretch: clear the region after a few seconds so stale text isn't reachable by virtual-cursor browsing.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec that asserts DOM text changes and the accessibility tree.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
