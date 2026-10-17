/**
 * Turn a streaming response body of newline-delimited JSON into an async
 * iterable of parsed values.
 */
export function readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncIterable<T> {
  // TODO
  throw new Error("TODO");
}
