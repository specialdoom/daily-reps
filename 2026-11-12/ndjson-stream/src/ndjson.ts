export type ParseError = { line: string; error: unknown };

export interface NdjsonOptions {
  /** Called for a complete line that is not valid JSON. The stream must keep going. */
  onError?: (e: ParseError) => void;
}

/**
 * Turns a stream of byte chunks (Uint8Array) into a stream of parsed JSON values,
 * one per line of NDJSON.
 */
export function ndjsonStream(
  options: NdjsonOptions = {},
): TransformStream<Uint8Array, unknown> {
  // TODO
  throw new Error("TODO");
}
