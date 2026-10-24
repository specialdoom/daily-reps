import type { Plugin } from "vite";

/** Words that look like identifiers but cannot be used as `export const <name>`. */
export const RESERVED_WORDS: ReadonlySet<string> = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger", "default",
  "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
  "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
  "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
  "yield", "let", "static", "await", "implements", "interface", "package",
  "private", "protected", "public",
]);

/** Provided: matches names that are syntactically plain identifiers. */
export const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Serves `import ... from "<id>"` (e.g. "virtual:app-config") from memory.
 * `getData` is called on every `load`, so it can read fresh values.
 */
export function virtualJson(
  id: string,
  getData: () => Record<string, unknown>,
): Plugin {
  // TODO
  throw new Error("TODO");
}
