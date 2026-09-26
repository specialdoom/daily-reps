# Frontend Daily Challenge — 2026-09-25

## 1. Type-Safe Reactive State Store

**Focus Area:** TypeScript, State Management, Reactivity

**Difficulty:** Intermediate

## 🎯 Task Summary

Implement a lightweight, strongly typed state store in TypeScript, inspired by libraries such as Redux and Zustand. The store should support atomic updates, computed state, and scoped selector subscriptions.

## 📐 Requirements

### State Initialization

- Accept an initial state object.
- Fully infer the state shape through TypeScript.
- Prevent callers from mutating the store's state from outside.

### Core API

- `getState()`: returns the current state snapshot.
- `setState(updater)`: accepts either a partial state object or a function that receives the current state and returns a partial state.
- Notify subscribers only when their selected state changes.
- `subscribe(selector, listener)`: subscribes to a selected slice of state.
- Use strict equality checking (`===`) to detect selected-value changes.
- Return an `unsubscribe()` function.

### Computed State Bonus

Implement a `createComputed(store, selector)` helper that creates a read-only derived value and re-evaluates only when the selector's dependencies change.

## 🛠️ Suggested Interface

- `getState()`
- `setState(updater)`
- `subscribe(selector, listener)`
- `createComputed(store, selector)`

## 🚨 Edge Cases

- Setting an unrelated property should not notify subscribers selecting another property.
- Setting a property to the same value should not notify its subscribers.
- Both object and function updates should preserve the rest of the state.
- Unsubscribed listeners should never be called again.
- Subscribers should receive the selected value according to the chosen equality behavior.
- External callers must not be able to mutate the store through a returned state reference.
- Computed values should not recalculate when their selected dependencies have not changed.

## 🧪 Test Cases

- The initial state is returned by `getState()`.
- A partial update changes only the specified properties.
- A functional update receives the current state and updates correctly.
- A subscriber is called when its selected value changes.
- A subscriber is not called when an unrelated value changes.
- A subscriber is not called when its selected value remains strictly equal.
- Calling `unsubscribe()` prevents future notifications.
- Multiple subscribers can select different slices independently.
- A computed value updates when its dependencies change.
- A computed value does not re-evaluate for unrelated state changes.

---

Implement the core store first, then add the computed-state helper as a bonus.

## 2. Type-Safe Form Validator

**Focus Area:** TypeScript, Forms, Validation UX

**Difficulty:** Intermediate

## 🎯 Task Summary

Build a lightweight, strongly typed form validation utility for frontend forms. The goal is to validate fields using a schema, collect errors, and expose a unified API for checking field-level and form-level validity.

## 📐 Requirements

### Schema Definition

- Accept a form schema object whose keys are field names and whose values define validation rules.
- Each rule can define validation constraints such as:
  - required
  - minLength
  - maxLength
  - pattern
  - custom validator
- The validator should infer field names and values from the schema.

### Core API

- `validateField(form, fieldName, value)` returns either:
  - `null` when the field is valid
  - a string error message when invalid
- `validateForm(form, values)` returns a record of field names to error messages.
- `isFormValid(form, values)` returns a boolean.
- `touchField(fieldName)` / `markTouched` style behavior is optional, but field-level validation should be easy to trigger.

### Strong Typing

- The validator should be strongly typed so the form field names are known at compile time.
- Error messages should be predictable and easy to reason about.

### Validation Rules

Support at least these built-in validations:

- `required`
- `minLength`
- `maxLength`
- `pattern`
- `custom` function validator

## 🛠️ Suggested Interface

```ts
type Rule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
};

type FormSchema = Record<string, Rule>;
```

A validator helper should look roughly like:

```ts
validateField(schema, fieldName, value);
validateForm(schema, values);
isFormValid(schema, values);
```

## 🚨 Edge Cases

- Empty or whitespace-only values should be treated as empty for required checks.
- A field with no rule should be considered valid.
- A custom validator should run only when the field is otherwise valid.
- `pattern` should be checked against the raw value, not sanitized input.
- Unknown field names should be ignored or rejected without crashing.
- Empty form object should produce an empty validation result.

## 🧪 Test Cases

- Required field with empty value returns an error.
- Required field with non-empty value passes.
- minLength rejects strings shorter than the threshold.
- maxLength rejects strings longer than the threshold.
- pattern rejects values that do not match the regex.
- custom validator can add domain-specific rules.
- A form with one invalid field is considered invalid.
- A form with all valid fields is valid.
- validateForm returns an object mapping field names to their validation error.
- Unrelated fields are ignored when validating one field.

---

Create a reusable, type-safe validator that is easy to use in a real UI form with minimal ceremony.
