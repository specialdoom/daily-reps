### **Daily Frontend Challenge: [HTML & Semantics] The Error That Never Goes Away: `setCustomValidity` Is Sticky State**

> **Focus:** the lifecycle of a custom validity message (it persists until you reset it with `''`) · **Time box:** ~35 min
> **Format:** Debug / review · **Stack:** vanilla TypeScript (strict) + Vite 8 (`vite@8.3.5`)

#### **Overview**
A sign-up form checks "confirm password" with the Constraint Validation API. Users report that after one typo they can never submit, even once both fields match. This is one of the most common production bugs with native form validation: custom validity is state you own, and the browser never clears it for you.

---

### **What You'll Learn**

**Core concept:** `setCustomValidity(msg)` with a non-empty message marks the field invalid until you call `setCustomValidity("")`. Cross-field rules must be recomputed whenever *either* field changes.

**By the end you should be able to:**
- explain why a field with a leftover custom message blocks form submission and keeps `:user-invalid` styling
- implement a validate function that always resets, then conditionally sets, the message
- choose which events must trigger revalidation of a dependent field
- verify the fix using `validity.customError` and `checkValidity()`

**Skills practised:** Constraint Validation API · `validity.customError` · `:user-invalid` · event wiring · debugging by reproduction

**Prerequisites:** DOM events, basic HTML form attributes (`required`, `minlength`).

**Where this shows up in practice:** sign-up and change-password forms, "repeat email" fields, date-range pickers (end must be after start). Form libraries (React Hook Form, Vee-Validate) hide this, but native-validation-based forms hit it constantly.

**Self-check (answer after solving):**
1. Why does the form refuse to submit even though the user fixed the confirm field?
2. Which two fields' events must revalidate the confirm field, and why?
3. What is the difference between `validationMessage`, `validity.customError` and `checkValidity()`?

---

### **Starter**
The starter lives in `signup-form/`. Run it with `cd signup-form && npm install && npm run dev`.

The buggy code (`src/main.ts`):

```ts
confirmInput.addEventListener("blur", () => {
  if (confirmInput.value !== password.value) {
    confirmInput.setCustomValidity("Passwords do not match");
  }
  showError(confirmInput, confirmError);
});
```

**Symptoms:**
1. Type `hunter2hunter2` in Password and `wrong` in Confirm, then tab away: "Passwords do not match" appears (correct).
2. Fix Confirm to `hunter2hunter2` and tab away: the error is still shown, and Submit does nothing.
3. Type matching passwords first, then change Password afterwards: Confirm is not rechecked, so the form submits with mismatched values.
4. The error text only updates on blur, never while typing the correction.

---

### **Detailed Requirements**
- Find and explain the root cause of symptom 2 in one or two sentences (write it as a comment at the top of `main.ts`).
- Fix it so a matching Confirm field is valid again (`confirmInput.validity.customError === false`).
- Fix symptom 3: changing Password must revalidate Confirm.
- Fix symptom 4: revalidate on `input`, not only `blur`, but do not show an error on an untouched, empty field.
- Keep a single `validateConfirm(): void` function that is the only place calling `setCustomValidity`.

### **Acceptance Criteria**
- Mismatch, then correction: message disappears and Submit shows "Account created!".
- Match, then edit Password: Confirm becomes invalid with "Passwords do not match"; Submit is blocked.
- Native `required` still reports on an empty Confirm field (a custom message must not hide it).
- In DevTools, `document.querySelector('#confirm').validity.customError` is `false` whenever the values match.

---

### **Edge Cases & Performance Considerations**
- An empty Confirm field: `required` should win, so the custom message must be `""` there.
- Pasting into Confirm triggers `input` but not `blur`.
- Assistive tech: `#confirm-error` has `role="alert"`; avoid re-announcing an unchanged message on every keystroke.

**Stretch:** link the error with `aria-describedby` and set `aria-invalid` from `validity.valid`.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec that reproduces each symptom and checks the fix.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
