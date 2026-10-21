import { describe, expect, it, vi } from "vitest";
import type * as Ndjson from "./ndjson";

// NDJSON_IMPL lets the same suite run against the original solution:
//   NDJSON_IMPL=../../before-review/ndjson-feed/src/ndjson.ts npx vitest run
const { readNdjson }: typeof Ndjson = await import(
  /* @vite-ignore */ process.env.NDJSON_IMPL ?? "./ndjson"
);

type Ev = { id: number; text: string };

const encoder = new TextEncoder();
const words = ["café", "naïve", "日本語", "😀 party", "résumé", "plain"];

function feed({ count = 300, newline = "\n", trailing = true } = {}) {
  const lines: string[] = [];
  for (let i = 1; i <= count; i++) {
    lines.push(JSON.stringify({ id: i, text: `${words[i % words.length]} #${i}` }));
    if (i === 50) lines.push("");
  }
  return lines.join(newline) + (trailing ? newline : "");
}

/** Cuts `bytes` at pseudo-random byte offsets, like the dev server's mock. */
function chunk(bytes: Uint8Array, maxSize: number, seed = 7) {
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; ) {
    const size = 1 + Math.floor(rand() * maxSize);
    chunks.push(bytes.subarray(i, i + size));
    i += size;
  }
  return chunks;
}

function streamOf(
  chunks: Uint8Array[],
  { error, open = false }: { error?: unknown; open?: boolean } = {},
) {
  const cancel = vi.fn();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else if (error) controller.error(error);
      else if (!open) controller.close();
    },
    cancel,
  });
  return { body, cancel };
}

const textStream = (...parts: string[]) => streamOf(parts.map((p) => encoder.encode(p))).body;
/** A body whose connection is still open after `parts`, so cancelling it reaches the source. */
const openStream = (...parts: string[]) => streamOf(parts.map((p) => encoder.encode(p)), { open: true });

async function collect<T>(iterable: AsyncIterable<T>) {
  const out: T[] = [];
  for await (const value of iterable) out.push(value);
  return out;
}

function expectFeed(events: Ev[], count = 300) {
  expect(events.map((e) => e.id)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
  for (const e of events) expect(e.text).toBe(`${words[e.id % words.length]} #${e.id}`);
}

describe("splitting", () => {
  it.each([1, 3, 7, 40])("handles lines and characters cut at random byte offsets (chunks ≤ %i bytes)", async (max) => {
    for (const seed of [1, 7, 42]) {
      const { body } = streamOf(chunk(encoder.encode(feed()), max, seed));
      expectFeed(await collect(readNdjson<Ev>(body)));
    }
  });

  it("decodes a character whose bytes arrive in four separate chunks", async () => {
    const bytes = encoder.encode('{"id":1,"text":"😀"}\n');
    const at = bytes.indexOf(0xf0);
    const parts = [bytes.subarray(0, at + 1), bytes.subarray(at + 1, at + 2), bytes.subarray(at + 2, at + 3), bytes.subarray(at + 3)];
    expect(await collect(readNdjson(streamOf(parts).body))).toEqual([{ id: 1, text: "😀" }]);
  });

  it("flushes the last line when there is no trailing newline", async () => {
    const { body } = streamOf(chunk(encoder.encode(feed({ trailing: false })), 40));
    expectFeed(await collect(readNdjson<Ev>(body)));
  });

  it("handles \\r\\n line endings, also split between chunks", async () => {
    expect(await collect(readNdjson(textStream('{"a":1}\r', '\n{"a":2}\r\n')))).toEqual([{ a: 1 }, { a: 2 }]);
    const { body } = streamOf(chunk(encoder.encode(feed({ newline: "\r\n" })), 7));
    expectFeed(await collect(readNdjson<Ev>(body)));
  });

  it("skips blank and whitespace-only lines", async () => {
    expect(await collect(readNdjson(textStream("\n", '{"a":1}\n  \n\t\r\n', '{"a":2}\n\n')))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("yields nothing for an empty body", async () => {
    expect(await collect(readNdjson(textStream()))).toEqual([]);
  });

  it("yields a line as soon as its newline arrives, before the stream ends", async () => {
    let enqueue!: (s: string) => void;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        enqueue = (s) => controller.enqueue(encoder.encode(s));
      },
    });
    const it = readNdjson<{ a: number }>(body)[Symbol.asyncIterator]();

    enqueue('{"a":1}\n{"a"');
    expect(await it.next()).toEqual({ done: false, value: { a: 1 } });
    enqueue(":2}\n");
    expect(await it.next()).toEqual({ done: false, value: { a: 2 } });
    await it.return?.();
  });

  it("doesn't rescan the buffered line on every chunk (one 4 MB line in ≤1 KB chunks)", async () => {
    const long = JSON.stringify({ id: 1, text: "x".repeat(4_000_000) }) + "\n";
    const chunks = chunk(encoder.encode(long + '{"id":2}\n'), 1024);
    const started = performance.now();
    const events = await collect(readNdjson<Ev>(streamOf(chunks).body));
    expect(events.map((e) => e.id)).toEqual([1, 2]);
    expect(events[0].text).toHaveLength(4_000_000);
    expect(performance.now() - started).toBeLessThan(1000);
  }, 60_000);
});

describe("errors", () => {
  it("rejects on a malformed line, naming the line, after yielding the good ones", async () => {
    const seen: unknown[] = [];
    const run = async () => {
      for await (const v of readNdjson(textStream('{"a":1}\n{"a":', '2,}\n{"a":3}\n'))) seen.push(v);
    };
    await expect(run()).rejects.toThrow(/line 2.*\{"a":2,\}/);
    expect(seen).toEqual([{ a: 1 }]);
  });

  it("names a malformed final line without a newline too", async () => {
    await expect(collect(readNdjson(textStream('{"a":1}\n{"a"')))).rejects.toThrow(/line 2.*\{"a"/);
  });

  it("keeps the cause of the parse error", async () => {
    const err = await collect(readNdjson(textStream("nope\n"))).catch((e: unknown) => e);
    expect((err as Error).cause).toBeInstanceOf(SyntaxError);
  });

  it("propagates the stream's own error (e.g. a dropped connection), not a parse error for the partial line", async () => {
    const dropped = new TypeError("network error");
    const { body } = streamOf([encoder.encode('{"a":1}\n{"a":'), encoder.encode("2,")], { error: dropped });
    const seen: unknown[] = [];
    const run = async () => {
      for await (const v of readNdjson(body)) seen.push(v);
    };
    await expect(run()).rejects.toBe(dropped);
    expect(seen).toEqual([{ a: 1 }]);
  });

  it("propagates an abort as the AbortError", async () => {
    const abort = new DOMException("The user aborted a request.", "AbortError");
    const { body } = streamOf([encoder.encode('{"a":1}\n')], { error: abort });
    await expect(collect(readNdjson(body))).rejects.toBe(abort);
  });
});

describe("releasing the stream", () => {
  it("cancels the body when the consumer breaks early", async () => {
    const { body, cancel } = openStream('{"a":1}\n{"a":2}\n', '{"a":3}\n');
    for await (const _ of readNdjson(body)) break;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
  });

  it("cancels the body when the consumer throws", async () => {
    const { body, cancel } = openStream('{"a":1}\n{"a":2}\n');
    const boom = new Error("boom");
    const run = async () => {
      for await (const _ of readNdjson(body)) throw boom;
    };
    await expect(run()).rejects.toBe(boom);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
  });

  it("cancels the body on a malformed line", async () => {
    const { body, cancel } = openStream("nope\n", '{"a":1}\n');
    await expect(collect(readNdjson(body))).rejects.toThrow();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("unlocks the body after reading it to the end", async () => {
    const body = textStream('{"a":1}\n');
    await collect(readNdjson(body));
    expect(body.locked).toBe(false);
  });
});
