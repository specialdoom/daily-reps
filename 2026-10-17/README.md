### **Daily Frontend Challenge: [Core Web APIs & Performance] Streaming NDJSON: Lines Don't Respect Chunk Boundaries**

> **Focus:** incremental line-splitting of a streamed `fetch` body (chunk boundaries inside lines and inside UTF-8 characters) · **Time box:** ~45 min
> **Format:** Small app · **Stack:** vanilla TypeScript (strict) + Vite 8

#### **Overview**
A feed endpoint streams newline-delimited JSON so the UI can render events as they arrive instead of waiting for the whole response. The network does not care about your line breaks: one chunk can end mid-line, mid-JSON-value, or even halfway through a multi-byte character like `日` or `😀`. Implement `readNdjson`, an async iterable over a response body that yields each parsed value exactly once, and wire it into a tiny live list with a working Stop button.

---

### **What You'll Learn**

**Core concept:** a stream reader must buffer the incomplete tail between chunks, and decode bytes with a streaming decoder so partial characters are not corrupted.

**By the end you should be able to:**
- explain why `chunk.toString().split("\n")` corrupts data on real streams
- implement a carry-over buffer for a trailing partial line
- decode UTF-8 incrementally with `TextDecoder` (`{ stream: true }`) or `TextDecoderStream`
- release the stream reader correctly when the consumer stops early or the request is aborted

**Skills practised:** Streams API · fetch · TextDecoder · async iterators · AbortController

**Prerequisites:** `async`/`await`, `for await…of`, basic `fetch`.

**Where this shows up in practice:** LLM token streaming, log tailing, bulk export/import endpoints, `application/x-ndjson` APIs (Elasticsearch, OpenAI-style streams).

**Self-check (answer after solving):**
1. Why does decoding each chunk independently break `"日本語"`, and what state does `TextDecoder` keep when `stream: true`?
2. What must happen to the last line if the server doesn't send a trailing newline?
3. What happens to the underlying connection if the consumer `break`s out of `for await`?

---

### **Starter**
The project lives in `ndjson-feed/`. Run it with `cd ndjson-feed && npm install && npm run dev`.

- `src/ndjson.ts` — stub of `readNdjson` (your main work).
- `src/main.ts` — the page logic, with one `TODO` where the response body is consumed.
- `vite.config.ts` — a mock `/api/events` endpoint that streams 300 events (including accented, CJK and emoji text and one blank line) in tiny chunks cut at **random byte offsets**. Query params: `?trailingNewline=0` (no final `\n`) and `?fail=1` (connection drops halfway).

```ts
export function readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncIterable<T>;
```

---

### **Detailed Requirements**
- Yield each non-blank line as `JSON.parse(line) as T`, in order, as soon as its `\n` arrives (do not wait for the end of the stream).
- Correctly handle lines and multi-byte characters split across chunks.
- Skip blank lines; handle `\r\n` line endings.
- Flush the final line if the stream ends without a trailing newline.
- If the consumer stops early (`break`/`return`/throw) or the `fetch` is aborted, release the reader/lock so the connection is not left hanging.
- In `main.ts`, render one `<li>` per event as `#<id> <text>` and keep the status text (`streaming… N events`) updated; at the end show `done: N events`.

### **Acceptance Criteria**
- Click **Start**: the list fills progressively (not all at once) and ends with `done: 300 events` (the blank line is skipped).
- Every row's text matches its id's word exactly (`日本語 #2`, `😀 party #3`): no `�` characters anywhere.
- Click **Stop** mid-stream: the status shows `stopped after N events`, the Network panel shows the request cancelled, and **Start** works again.
- Change the fetch URL to `/api/events?trailingNewline=0`: the last event (#300) still appears.
- With `/api/events?fail=1` the status shows the error and the events received so far stay in the list.

---

### **Edge Cases & Performance Considerations**
- A malformed JSON line should reject the iteration with an error naming the offending line, not silently skip it.
- Don't re-scan the whole buffer on every chunk (avoid O(n²) concatenation when a line is very long).
- Stretch: expose the same behaviour as a `TransformStream<Uint8Array, T>` so it composes with `pipeThrough`.

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest or Playwright suite.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
