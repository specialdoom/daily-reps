import { describe, it, expect, vi } from "vitest";
import { createFormValidator } from "./form-validator.js"; // adjust path if your implementation file differs

describe("Form Validator", () => {
  const schema = {
    username: { required: true, minLength: 3 },
    password: { required: true, minLength: 8 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    bio: { maxLength: 10 },
    nickname: {
      pattern: /^[A-Za-z0-9_]+$/,
      custom: (v: string) =>
        v.includes("bad") ? "Contains forbidden word" : null,
    },
    optional: {},
  } as const;

  const validator = createFormValidator(schema);

  it("validates required fields (empty and whitespace-only fail)", () => {
    expect(validator.validateField("username", "")).toBeTypeOf("string");
    expect(validator.validateField("username", "   ")).toBeTypeOf("string");
    expect(validator.validateField("username", "bob")).toBeNull();

    expect(validator.validateField("password", "short")).toBeTypeOf("string");
    expect(validator.validateField("password", "longenough")).toBeNull();
  });

  it("enforces minLength and maxLength", () => {
    // minLength on username (3)
    expect(validator.validateField("username", "ab")).toBeTypeOf("string");
    expect(validator.validateField("username", "abc")).toBeNull();

    // minLength on password (8)
    expect(validator.validateField("password", "1234567")).toBeTypeOf("string");
    expect(validator.validateField("password", "12345678")).toBeNull();

    // maxLength on bio (10)
    expect(validator.validateField("bio", "short")).toBeNull();
    expect(validator.validateField("bio", "this is too long")).toBeTypeOf(
      "string",
    );
  });

  it("validates pattern (email) against raw input", () => {
    expect(validator.validateField("email", "not-an-email")).toBeTypeOf(
      "string",
    );
    expect(validator.validateField("email", "a@b.com")).toBeNull();
  });

  it("runs custom validator only when other validations pass", () => {
    const customSpy = vi.fn((v: string) => (v.includes("bad") ? "bad" : null));
    const localSchema = {
      nick: { pattern: /^[a-z]+$/, custom: customSpy },
    } as const;

    const localValidator = createFormValidator(localSchema);

    // pattern fails -> custom SHOULD NOT be called
    expect(localValidator.validateField("nick", "INVALID123")).toBeTypeOf(
      "string",
    );
    expect(customSpy).not.toHaveBeenCalled();

    // pattern passes -> custom runs
    customSpy.mockClear();
    expect(localValidator.validateField("nick", "good")).toBeNull();
    expect(customSpy).toHaveBeenCalledTimes(1);

    // custom returns string when rule triggers
    expect(localValidator.validateField("nick", "bad")).toBeTypeOf("string");
  });

  it("validateForm returns a map of field -> error|string|null for each schema field", () => {
    const values = {
      username: "a",
      password: "short",
      email: "ok@site.com",
      bio: "ok",
      nickname: "fine",
      extraField: "ignored",
    };

    const result = validator.validateForm(values as Record<string, any>);

    // Expect an entry for each declared schema field
    expect(Object.keys(result).sort()).toEqual(Object.keys(schema).sort());

    // username and password should have errors, others are null
    expect(result.username).toBeTypeOf("string");
    expect(result.password).toBeTypeOf("string");
    expect(result.email).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.nickname).toBeNull();
    expect(result.optional).toBeNull();
  });

  it("isFormValid returns true only when all fields are valid", () => {
    const good = {
      username: "alice",
      password: "supersecret",
      email: "a@b.com",
      bio: "",
      nickname: "nick",
      optional: "",
    };

    const bad = {
      ...good,
      password: "short",
    };

    expect(validator.isFormValid(good)).toBe(true);
    expect(validator.isFormValid(bad)).toBe(false);
  });

  it("does not crash or throw when unknown fields are present in values", () => {
    const valuesWithUnknown = {
      username: "alice",
      password: "supersecret",
      email: "a@b.com",
      bio: "",
      nickname: "nick",
      optional: "",
      totallyUnknown: 123,
    };

    expect(() =>
      validator.validateForm(valuesWithUnknown as any),
    ).not.toThrow();
    expect(() => validator.isFormValid(valuesWithUnknown as any)).not.toThrow();
  });

  it("validateField for an unknown field returns null (or treats it as valid)", () => {
    // The spec allows either ignoring unknown fields or rejecting them; prefer not crashing.
    // If your implementation throws, change this test to expect a throw instead.
    expect(() =>
      validator.validateField("thisDoesNotExist" as any, "x"),
    ).not.toThrow();
  });

  it("custom validator error messages are returned as strings", () => {
    const schemaWithCustom = {
      code: {
        custom: (v: string) => (v !== "OK" ? "must be OK" : null),
      },
    } as const;

    const v = createFormValidator(schemaWithCustom);
    expect(v.validateField("code", "NO")).toBe("must be OK");
    expect(v.validateField("code", "OK")).toBeNull();
  });
});
