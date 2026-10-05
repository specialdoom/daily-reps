type PathMap<T, L extends unknown[] = []> = {
  [K in keyof T]: `${K & (string | number)}.${Path<T[K], [...L, 0]> & (string | number)}`;
};

type Path<T, L extends unknown[] = []> = L["length"] extends 5
  ? never
  : T extends (infer U)[]
    ? `${number}` | `${number}.${Path<U, [...L, 0]> & string}`
    : T extends object
      ? PathMap<T, L>[keyof T] | keyof T
      : undefined;

type PathValue<T, P> = P extends `${infer Head & string}.${infer Rest}`
  ? Head extends keyof T
    ? PathValue<T[Head], Rest>
    : T extends unknown[]
      ? PathValue<T[number], Rest>
      : never
  : P extends keyof T
    ? T[P]
    : T extends unknown[]
      ? T[number]
      : never;

export function get<T, P extends Path<T>>(
  obj: T,
  path: P,
): PathValue<T, P> | undefined {
  if (!path) return undefined;

  const segments = path.split(".");
  if (segments.length === 0) return undefined;

  let value = obj;

  for (let segment of segments) {
    if (!value) return undefined;

    value = value[segment] ?? undefined;
  }

  return value;
}
