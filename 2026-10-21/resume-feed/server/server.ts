import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

// Mock server. You should not need to change it.
// - one event every 400 ms, ids 1, 2, 3, ... (retains the last 40)
// - drops every connection after 6 events
// - every 4th connection attempt is answered with 503
// - on resume it replays from `Last-Event-ID` (header) or `?lastEventId=`,
//   starting 2 events early (at-least-once delivery), so duplicates happen
// - if the cursor is older than the retained window it sends `event: reset` first

type Tick = { id: number; symbol: string; price: number };

const RETAIN = 40;
const log: Tick[] = [];
let nextId = 1;
let price = 100;

setInterval(() => {
  price = Math.max(1, price + (Math.random() - 0.5) * 2);
  log.push({ id: nextId++, symbol: "ACME", price: Math.round(price * 100) / 100 });
  if (log.length > RETAIN) log.shift();
}, 400);

let attempts = 0;
const app = new Hono();

app.get("/events", (c) => {
  attempts++;
  if (attempts % 4 === 0) return c.text("unavailable", 503);

  const raw = c.req.header("Last-Event-ID") ?? c.req.query("lastEventId");
  const cursor = raw === undefined || raw === "" ? undefined : Number(raw);

  return streamSSE(c, async (stream) => {
    let sent = 0;
    let last = nextId - 1; // fresh clients start from "now"
    if (cursor !== undefined && Number.isFinite(cursor)) {
      const oldest = log[0]?.id ?? nextId;
      if (cursor < oldest - 1) await stream.writeSSE({ event: "reset", data: String(oldest) });
      last = Math.max(cursor - 2, oldest - 1);
    }
    while (!stream.aborted && sent < 6) {
      for (const t of log.filter((e) => e.id > last)) {
        await stream.writeSSE({ id: String(t.id), data: JSON.stringify(t) });
        last = t.id;
        sent++;
      }
      await stream.sleep(100);
    }
  });
});

serve({ fetch: app.fetch, port: 8787 }, () => console.log("mock SSE server on http://localhost:8787/events"));
