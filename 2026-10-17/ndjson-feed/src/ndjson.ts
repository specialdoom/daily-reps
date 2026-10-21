/**
 * Turn a streaming response body of newline-delimited JSON into an async
 * iterable of parsed values.
 */
export async function* readNdjson<T>(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let carryOver = "";
  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const decodedValue = decoder.decode(value, { stream: true });

      carryOver += decodedValue;

      const lines = carryOver.split("\n");

      carryOver = lines.pop() ?? "";

      for (const line of lines) {
        const text = line.trim();
        if (text === "") continue;
        yield JSON.parse(text) as T;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  carryOver += decoder.decode();
  const text = carryOver.trim();
  if (text !== "") yield JSON.parse(text);
  carryOver = "";
}
