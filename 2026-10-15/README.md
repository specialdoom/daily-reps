### **Daily Frontend Challenge: [HTML & Semantics] A Native `<dialog>` Behind a Promise: `returnValue`, `cancel` and `close`**

> **Focus:** wrapping the native `<dialog>` lifecycle (`showModal`, `cancel`, `close`, `returnValue`) in a promise-returning Angular component · **Time box:** ~45 min
> **Format:** Component · **Stack:** Angular 21 (`@angular/core@21.2.25`, standalone components + signals) + TypeScript

#### **Overview**
Teams still ship modals built from a `div`, a focus-trap library and a hand-rolled Esc handler, while `<dialog>` gives the focus trap, top layer, backdrop, Esc handling and focus restoration for free. The catch is that its API is event-based and its "result" lives in `returnValue`. You'll wrap it so callers can simply `await dialog.open(name)`, and handle the two behaviours that trip people up: dismissing with Esc, and discarding unsaved edits.

---

### **What You'll Learn**

**Core concept:** the native dialog lifecycle: `form method="dialog"`, `returnValue`, the cancelable `cancel` event versus the `close` event, and mapping them to a single promise resolution.

**By the end you should be able to:**
- Explain which event fires for Esc (`cancel`, then `close`) and which for a `method="dialog"` submit (only `close`).
- Implement a promise API that resolves exactly once with a value or `null`.
- Intercept dismissal with `preventDefault()` on `cancel` to guard unsaved input.
- Verify that focus returns to the opener and that the dialog is accessible by name.

**Skills practised:** `<dialog>` · `form method="dialog"` · constraint validation · focus management · Angular signals and `viewChild`

**Prerequisites:** basic Angular components (`@Component`, signals, `viewChild`) and the DOM event model.

**Where this shows up in practice:** rename/delete/confirm modals, "unsaved changes" guards; the same wrapper idea applies to any framework (a React `useDialog` hook, a Vue composable).

**Self-check (answer after solving):**
1. Why can't you tell Save from Cancel from the `close` event alone, and where does that information live?
2. If a `cancel` event is prevented, does `close` fire? What if the user then presses Esc again?
3. Why does the native dialog restore focus to the opener without any code from you?

---

### **Why Angular (signals)?**
Angular's current standalone, signal-based style (`signal`, `viewChild()`, no NgModules or Zone-based change detection concerns for this task) is quite different from older Angular tutorials. See the [Angular docs](https://angular.dev/overview).

---

### **Starter**
The project is in [`rename-dialog/`](./rename-dialog). Run it with:

```bash
cd rename-dialog && npm install && npm start
```

`src/app/app.ts` lists three files, each with a **Rename** button that calls `await dialog().open(name)` and applies the result. `src/app/rename-dialog.ts` already contains the `<dialog>` markup (a `method="dialog"` form with Cancel and Save buttons whose `value`s become the `returnValue`) and an `open()` stub that throws. Your work is the `open()` method and the event wiring.

---

### **Detailed Requirements**
Implement `open(current: string): Promise<string | null>` in `RenameDialog` (add small private helpers or a constructor/`afterNextRender` hook if you need them).

- `open()` pre-fills the input with `current` (the `initial` signal), clears `warning`, calls `showModal()`, and returns a promise.
- Save (`returnValue === "save"`) resolves with the trimmed input value; Cancel, Esc and backdrop click resolve with `null`. The input is `required`, so an empty Save must be blocked by the browser and the dialog must stay open.
- Resolve **exactly once**, from the `close` event (not from click handlers), and read the input value at that moment.
- **Dirty guard:** if the input differs from `current` and the user presses Esc or clicks the backdrop, the first attempt must be cancelled (`preventDefault()` on `cancel`; for the backdrop, simply don't close) and `warning` set to `"Discard changes? Press Esc again."`. The next dismissal closes it and resolves `null`.
- No `any`; strict TypeScript. Do not use a third-party dialog or focus-trap library.

### **Acceptance Criteria**
- Click **Rename** on `photo.png`: a modal opens, the page behind is inert, and the input holds `photo.png` and has focus.
- Press Esc without typing: the dialog closes, the file name is unchanged, and focus is back on the **Rename** button you used.
- Type `pic.png` and press Save (or Enter): the list shows `pic.png`. Typing then pressing Esc shows the warning and keeps the dialog open; a second Esc closes it without renaming.
- Clearing the input and pressing Save shows the browser's validation bubble and the dialog stays open. Cancel still works with an empty input.
- Re-opening the dialog on another file shows that file's name and no stale warning.

---

### **Edge Cases & Performance Considerations**
- Calling `open()` while the dialog is already open (e.g. via double-click timing) must not leave an unresolved promise behind or throw `InvalidStateError`.
- Listener hygiene: attaching `close`/`cancel` listeners on every `open()` without removing them resolves old promises with new values, so use `{ once: true }` or a single registration.
- Stretch: resolve `null` if the component is destroyed while the dialog is open (`DestroyRef`).

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite covering the acceptance criteria, or a Vitest/Angular test setup.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
