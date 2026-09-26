// After review

type Rule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
};

type FormSchema = Record<string, Rule>;

type FormValues<S extends FormSchema> = { [K in keyof S]: string };
type FormValidation<S extends FormSchema> = { [K in keyof S]: string | null };

export function createFormValidator<S extends FormSchema>(schema: S) {
  function isEmpty(value: string) {
    return value.trim().length === 0;
  }

  function validateField<K extends keyof S>(
    fieldName: K,
    rawValue: string | undefined,
  ): string | null {
    const rule = schema[fieldName as string];
    // Treat missing value as empty string (defensive)
    const value = rawValue ?? "";

    if (!rule) {
      // unknown field -> treat as valid (or throw if you prefer)
      return null;
    }

    if (rule.required && isEmpty(value)) {
      return `Field ${String(fieldName)} is required.`;
    }

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `Field ${String(fieldName)} must be at least ${rule.minLength} characters long.`;
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `Field ${String(fieldName)} must be at most ${rule.maxLength} characters long.`;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      return `Field ${String(fieldName)} does not match the required pattern.`;
    }

    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) return customError;
    }

    return null;
  }

  function validateForm(values: Partial<FormValues<S>>): FormValidation<S> {
    const errors = {} as FormValidation<S>;

    // Iterate schema keys to ensure consistent result shape
    (Object.keys(schema) as Array<keyof S>).forEach((k) => {
      const v = (values as any)[k]; // could be undefined
      errors[k] = validateField(k, v);
    });

    return errors;
  }

  function isFormValid(values: Partial<FormValues<S>>): boolean {
    const errors = validateForm(values);
    return (Object.keys(errors) as Array<keyof S>).every(
      (k) => errors[k] === null,
    );
  }

  return {
    validateField,
    validateForm,
    isFormValid,
  };
}
