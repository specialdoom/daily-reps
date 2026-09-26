type Rule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
};

type FormSchema = Record<string, Rule>;

type FormValues = Record<keyof FormSchema, string>;

type FormValidation = Record<keyof FormSchema, string | null>;

type FormValidator = {
  validateField(fieldName: keyof FormSchema, value: string): string | null;
  validateForm(values: FormValues): FormValidation;
  isFormValid(values: FormValues): boolean;
};

export function createFormValidator(schema: FormSchema): FormValidator {
  function required(value: string) {
    if (!value.trim()) return true;

    return !value;
  }

  function validateField(fieldName: keyof FormSchema, value: string) {
    const field = schema[fieldName];

    if (!field) {
      return null;
    }

    if (field.required && required(value)) {
      return `Field ${fieldName} is required.`;
    }

    if (field.minLength && value.length < field.minLength) {
      return `Field ${fieldName} must be at least ${field.minLength} characters long.`;
    }

    if (field.maxLength && value.length > field.maxLength) {
      return `Field ${fieldName} must be at most ${field.maxLength} characters long.`;
    }

    if (field.pattern && !field.pattern.test(value)) {
      return `Field ${fieldName} does not match the required pattern.`;
    }

    if (field.custom) {
      const customError = field.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  function validateForm(values: FormValues): FormValidation {
    const errors: FormValidation = {};

    Object.keys(schema).forEach((fieldName) => {
      errors[fieldName] = validateField(fieldName, values[fieldName]);
    });

    return errors;
  }

  function isFormValid(values: FormValues) {
    return Object.keys(schema).every((fieldName) => {
      return !validateField(fieldName, values[fieldName]);
    });
  }

  return {
    validateField,
    validateForm,
    isFormValid,
  };
}
