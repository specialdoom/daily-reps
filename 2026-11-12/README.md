### **Daily Frontend Challenge: [Core Web APIs & Performance] Streaming NDJSON: Chunk Boundaries Are Not Line Boundaries**

> **Focus:** a `TransformStream` that parses NDJSON from arbitrary byte chunks (carry-over buffer, multi-byte UTF-8 split across chunks, `flush`) · **Time box:** ~45 min
> **Format:** Library · **Stack:** vanilla TypeScript 5.9 (strict) + Vitest 5 (`vitest@5.1.0`), Node 22 (Web Streams are global)

#### **Overview**
An API streams results as newline-delimited JSON (`{"id":1}\n{"id":2}\n…`) so the UI can render rows as they arrive instead of waiting for the whole response. The network cuts the body into chunks wherever it likes: in the middle of a line, in the middle of a JSON string, even in the middle of a multi-byte character such as `é` or `🙂`. A naive `chunk.split("\n").map(JSON.parse)` works on localhost and breaks in production.

---

### **What You'll Learn**

**Core concept:** a streaming parser must own the state between chunks: keep the unfinished tail, decode bytes without corrupting split characters, and emit the leftover in `flush`.

**By the end you should be able to:**
- implement a `TransformStream` with `transform` and `flush`
- explain why `TextDecoder` needs `{ stream: true }` and what happens without it
- handle `\r\n`, empty lines and a missing final newline
- pipe `response.body` through your transform and consume it with `for await`

**Skills practised:** Web Streams · TextDecoder · buffering · error isolation

**Prerequisites:** basic `ReadableStream` / `pipeThrough`, UTF-8 basics.

**Where this shows up in practice:** streamed LLM and search responses, log tails, bulk exports. Same pattern in Node `readline`, Go's `bufio.Scanner`, and `eventsource-parser` for SSE.

**Self-check (answer after solving):**
1. Why does `new TextDecoder().decode(chunk)` per chunk corrupt `🙂` when it is split, and what does `{ stream: true }` change?
2. What is lost if you forget `flush`?
3. Why should one bad line not error the whole stream?

---

### **Starter**
Project: `ndjson-stream/`. Run with `cd ndjson-stream && npm install && npm run check` (add your own tests, or ask for a suite via Next Step A and run `npm test`).

```ts
export type ParseError = { line: string; error: unknown };

export interface NdjsonOptions {
  onError?: (e: ParseError) => void;
}

export function ndjsonStream(
  options: NdjsonOptions = {},
): TransformStream<Uint8Array, unknown> {
  // TODO
  throw new Error("TODO");
}
```

---

### **Detailed Requirements**
- Emit one parsed value per non-empty line, in order, regardless of how the input bytes are chunked (1 byte at a time must give the same result as one big chunk).
- Decode incrementally so multi-byte UTF-8 characters split across chunks survive intact.
- Accept `\n` and `\r\n`; skip blank (whitespace-only) lines.
- In `flush`, parse a final line that has no trailing newline.
- A line that fails `JSON.parse` is reported via `options.onError({ line, error })` and skipped; the stream continues. Without `onError` the bad line is silently skipped.

### **Edge Cases & Performance Considerations**
- Chunk that ends exactly on `\n`, and a chunk containing no newline at all (must not emit and must not lose data).
- Split inside a multi-byte character, e.g. bytes of `"🙂"` fed one by one.
- Don't re-scan the whole buffer on every chunk: only look for newlines in the new data (quadratic behaviour on a long line without `\n`).
- Stretch: enforce a `maxLineLength` option that errors the stream instead of buffering unboundedly.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite (including a byte-by-byte chunking test).
- **(B)** Paste your solution for a review of correctness, edge cases and performance.
