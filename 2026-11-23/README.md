### **Daily Frontend Challenge: [HTML & Semantics] Confirm Before Delete: A Native `<dialog>` and `returnValue`**

> **Focus:** a modal `<dialog>` driven by the platform (`showModal()`, `<form method="dialog">`, `returnValue`, the `close` event) instead of hand-rolled state · **Time box:** ~35 min
> **Format:** Component · **Stack:** vanilla TypeScript (strict) + Vite 8 (`vite@8.3.5`), plain HTML

#### **Overview**
A file list deletes items the moment you click "Delete". Product wants a confirmation step. Many teams build this with a custom overlay, a focus trap and a state flag, yet the browser's `<dialog>` already provides the focus trap, `Esc` handling, backdrop, inertness of the page and focus restore. The markup for the dialog is already in the starter; the job is to wire it correctly.

---

### **What You'll Learn**

**Core concept:** a modal `<dialog>` reports its outcome through `returnValue`, set by the submit button of a `<form method="dialog">`, and every way of closing it fires one `close` event.

**By the end you should be able to:**
- explain the difference between `show()` and `showModal()`;
- read the user's choice from `dialog.returnValue` in a `close` listener;
- explain why `Esc` must count as "cancel" and what `returnValue` holds in that case;
- verify that focus returns to the invoking button without any manual code.

**Skills practised:** `<dialog>` · `returnValue` · form `method="dialog"` · focus management · event delegation

**Prerequisites:** basic DOM events and TypeScript.

**Where this shows up in practice:** destructive-action confirmations in file managers, admin tables and settings pages. React/Vue/Svelte wrappers around `<dialog>` use the same API.

**Self-check (answer after solving):**
1. Why can the `close` event be the only place you read the result, and what is `returnValue` after pressing `Esc`?
2. What happens to the second dialog open if you forget to reset `returnValue`?
3. What would you have to build by hand if you used a `<div role="dialog">` instead?

---

### **Starter**
The project lives in [`confirm-dialog/`](./confirm-dialog). Run it with `cd confirm-dialog && npm install && npm run dev`.

`index.html` already contains the list and this dialog:

```html
<dialog id="confirm" aria-labelledby="confirm-title">
  <form method="dialog">
    <h2 id="confirm-title">Delete file?</h2>
    <p>Delete <strong id="confirm-name"></strong>? This can't be undone.</p>
    <menu>
      <button value="cancel">Cancel</button>
      <button value="delete">Delete</button>
    </menu>
  </form>
</dialog>
```

`src/main.ts` currently deletes immediately and never opens the dialog:

```ts
list.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".delete");
  if (!button) return;
  nameEl.textContent = button.dataset.name ?? "";
  button.closest("li")?.remove(); // deletes immediately, no confirmation
  statusEl.textContent = `Deleted ${button.dataset.name}`;
});
```

---

### **Detailed Requirements**
- Clicking a row's "Delete" opens the dialog **modally** with the file name shown; nothing is removed yet.
- The row is removed only when the dialog closed with `returnValue === "delete"`.
- Cancel, `Esc` and any other close leave the list unchanged and announce "Cancelled" in `#status`.
- Remember which row triggered the dialog without storing it in a global that can go stale (e.g. keep a reference scoped to the open/close cycle).
- Use strict TypeScript, no `any`, and don't add JavaScript for focus trapping, `Esc` or the backdrop.

### **Acceptance Criteria**
- With the dialog open, `Tab` cycles only inside it and the page behind is not clickable.
- Pressing `Esc` closes it, the row stays, and focus returns to the "Delete" button that opened it.
- Confirming removes exactly the clicked row and announces `Deleted <name>`.
- Opening the dialog for a second file after a confirm, then pressing `Esc`, does **not** delete the second file.

---

### **Edge Cases & Performance Considerations**
- `returnValue` persists between openings: a previous `"delete"` must not leak into an `Esc` close.
- Deleting the last row removes the button that holds focus restore; decide where focus should go.
- Rapid double-click on "Delete" must not throw (`showModal()` on an already-open dialog throws `InvalidStateError`).

*Stretch:* close the dialog on a backdrop click using only `closedby="any"` or a small, correct handler.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
