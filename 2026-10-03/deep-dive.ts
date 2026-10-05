/**
 * Type-safe deep path getter (reviewed version).
 *
 * Review findings, most important first:
 *  1. `get` was declared to return `PathValue<T, P> | undefined`, so every call
 *     got `| undefined` added: the README examples came out as
 *     `string | undefined` instead of `string`.
 *  2. Optional parents broke the types. `keyof (X | undefined)` is `never`, so
 *     `PathValue` returned `never` for any path through an optional property,
 *     and `PathMap` kept the `?` modifier, which added `undefined` to `Path`.
 *  3. `Path` contained symbol keys (and `undefined` for primitives), so `P` was
 *     not known to be a string. `path.split` and `value[segment]` did not
 *     type-check, so the rough file did not compile under `strict`.
 *  4. `?? undefined` changed a `null` leaf into `undefined` (type said
 *     `string | null`, runtime gave `undefined`), and `if (!value)` used
 *     falsiness where the spec asks for a null/undefined check.
 *  5. `PathValue` did not constrain `P extends Path<T>` as the README requires,
 *     and `Path` / `PathValue` were not exported.
 *  6. Stretch goal: tuples were treated as plain arrays, so out-of-range
 *     indices like `"pair.5"` were accepted. `readonly` arrays fell through to
 *     the object branch and exposed `"map"`, `"length"`, and so on as paths.
 */

// Review: kept the author's depth limit of 5 and their tuple-of-length
// counter. Each recursion step adds one element. Named so the limit is easy to find.
type MaxDepth = 5;

// Review: `-?` removes the optional modifier. The rough version's homomorphic
// mapped type kept `?`, so `PathMap<T>[keyof T]` included `undefined`.
// `NonNullable<T[K]>` lets paths go through an optional (or nullable) parent:
// `Path<X | undefined>` would otherwise produce paths for `undefined`.
// Symbol keys map to `never` because they cannot appear in a dotted string.
// Each entry includes the key itself (`${K}`), so `Path` does not need a
// separate `| keyof T`. That union was what let symbols and raw numbers in.
type PathMap<T, L extends unknown[]> = {
  [K in keyof T]-?: K extends string | number
    ? `${K}` | `${K}.${Path<NonNullable<T[K]>, [...L, 0]>}`
    : never;
};

// Review: tuples (stretch goal) only expose their real indices ("0", "1"),
// not `${number}`, so `"pair.5"` is rejected. The methods and `length` on the
// tuple's keyof are filtered out.
type TupleIndex<T extends readonly unknown[]> = Extract<keyof T, `${number}`>;

/** Union of every valid dotted path into `T`, including intermediate paths. */
export type Path<T, L extends unknown[] = []> = L["length"] extends MaxDepth
  ? never
  : // Review: `readonly unknown[]` also matches readonly arrays and tuples.
    // Before, those fell into the object branch and exposed "map", "length", and so on.
    T extends readonly unknown[]
    ? number extends T["length"]
      ? `${number}` | `${number}.${Path<NonNullable<T[number]>, [...L, 0]>}`
      : PathMap<T, L>[TupleIndex<T>]
    : T extends object
      ? PathMap<T, L>[keyof T]
      : // Review: was `undefined`, which leaked into the `Path` union for
        // primitive roots and stopped `P` from being a string.
        never;

// Resolves one segment against a non-null parent.
// - Plain object keys and tuple indices ("1") match `keyof T` directly, which
//   gives exact tuple element types.
// - Array indices ("0") and numeric object keys (`{ 0: X }`) are not string
//   keys, so the segment is parsed back into a number literal.
type Step<T, K extends string> = K extends keyof T
  ? T[K]
  : K extends `${infer N extends number}`
    ? N extends keyof T
      ? T[N]
      : never
    : never;

// `get` returns `undefined` when it reaches a null/undefined intermediate.
// The type must reflect that. Distributive over `T`.
type NullishAsUndefined<T> = T extends null | undefined ? undefined : never;

// Review: the rough version looked up `Head` on `T` itself. When `T` was
// `X | undefined` (an optional parent), `keyof T` was `never` and the result
// was `never`. Now every step looks up on `NonNullable<T>` and adds
// `undefined` when the parent could be nullish, which is what the runtime does.
// Optional *leaves* still keep their `undefined` because `T[K]` includes it.
// The `infer Head & string` pattern is gone. `P` is always a string here.
type PathValueImpl<T, P> = P extends `${infer Head}.${infer Rest}`
  ? PathValueImpl<Step<NonNullable<T>, Head>, Rest> | NullishAsUndefined<T>
  : P extends string
    ? Step<NonNullable<T>, P> | NullishAsUndefined<T>
    : never;

/** The type found at path `P` inside `T`. */
// Review: now constrained to `P extends Path<T>`, as the README requires. The
// recursion runs in an unconstrained helper because `Rest` is not itself a
// `Path<T>` at each step.
export type PathValue<T, P extends Path<T>> = PathValueImpl<T, P>;

// Review: the return type is `PathValue<T, P>` with no `| undefined` added.
// Adding it made every result optional (`get(demo, "user.address.city")` was
// `string | undefined`). Where `undefined` can really occur (optional leaf
// or nullish intermediate), `PathValue` already includes it.
export function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
  // Review: removed `if (!path)` and the `segments.length === 0` check.
  // `""` is not a valid `Path`, and `split` never returns an empty array.
  // `String(path)` is needed because TS cannot prove that the deferred
  // `Path<T>` is a string inside the generic body.
  let value: unknown = obj;

  for (const segment of String(path).split(".")) {
    // Review: was `if (!value)`. Only null/undefined must stop the walk, as
    // the spec says. Do not depend on falsiness here.
    if (value === null || value === undefined) return undefined as PathValue<T, P>;

    // Review: dropped `?? undefined`, which turned a real `null` leaf into
    // `undefined` and contradicted a `string | null` type.
    // `value` is `unknown` (not `T`), so this indexing compiles under `strict`.
    value = (value as Record<string, unknown>)[segment];
  }

  return value as PathValue<T, P>;
}
