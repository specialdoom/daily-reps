/**
 * Turn a streaming response body of newline-delimited JSON into an async
 * iterable of parsed values.
 */
export async function* readNdjson<T>(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  // The unfinished line, kept as pieces and joined once its "\n" arrives: only
  // the new text is searched, so a line spread over many chunks isn't copied
  // and re-scanned on every chunk.
  let carryOver: string[] = [];
  let lineNumber = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const decodedValue = decoder.decode(value, { stream: true });

      let start = 0;
      let end: number;
      while ((end = decodedValue.indexOf("\n", start)) !== -1) {
        carryOver.push(decodedValue.slice(start, end));
        const line = carryOver.join("");
        carryOver = [];
        start = end + 1;

        const parsed = parseLine<T>(line, ++lineNumber);
        if (parsed !== undefined) yield parsed;
      }
      carryOver.push(decodedValue.slice(start));
    }

    carryOver.push(decoder.decode());
    const parsed = parseLine<T>(carryOver.join(""), ++lineNumber);
    if (parsed !== undefined) yield parsed;
  } finally {
    // Stops the download on an early exit; a no-op once the body has ended.
    // Its rejection is ignored so it can't replace the error already leaving.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Parses one line; `undefined` for a blank line (JSON never parses to it). */
function parseLine<T>(line: string, lineNumber: number): T | undefined {
  const text = line.trim();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    const shown = text.length > 200 ? `${text.slice(0, 200)}…` : text;
    throw new SyntaxError(`Invalid JSON on line ${lineNumber}: ${shown}`, { cause });
  }
}
