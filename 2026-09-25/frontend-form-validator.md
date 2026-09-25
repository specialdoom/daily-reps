# Frontend Daily Challenge — 2026-09-25

## Type-Safe Form Validator

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
validateField(schema, fieldName, value)
validateForm(schema, values)
isFormValid(schema, values)
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
