// Mock SSE server. Not part of the challenge: do not edit.
// GET  /events    -> text/event-stream; honours Last-Event-ID but REPLAYS 3 EXTRA events (at-least-once delivery)
// POST /__drop    -> abruptly closes every open stream (simulates a network drop)
// POST /__restart -> new epoch, sequence numbers start again at 1 (simulates a server restart)
import http from "node:http";

const SYMBOLS = ["ACME", "GLOBEX", "INITECH"];
let epoch = Date.now().toString(36);
let seq = 0;
let buffer = [];
const clients = new Set();

function frame(tick) {
  return `id: ${tick.seq}\ndata: ${JSON.stringify(tick)}\n\n`;
}

setInterval(() => {
  seq += 1;
  const tick = {
    epoch,
    seq,
    symbol: SYMBOLS[seq % SYMBOLS.length],
    price: Math.round((100 + Math.random() * 20) * 100) / 100,
  };
  buffer.push(tick);
  buffer = buffer.slice(-50);
  for (const res of clients) res.write(frame(tick));
}, 1000);

http
  .createServer((req, res) => {
    if (req.url === "/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write("retry: 1000\n\n");
      const last = Number(req.headers["last-event-id"] ?? 0);
      const from = last > seq ? 0 : Math.max(0, last - 3); // overlap on purpose
      for (const tick of buffer.filter((t) => t.seq > from)) res.write(frame(tick));
      clients.add(res);
      req.on("close", () => clients.delete(res));
    } else if (req.url === "/__drop" && req.method === "POST") {
      for (const res of clients) res.destroy();
      clients.clear();
      res.end("dropped\n");
    } else if (req.url === "/__restart" && req.method === "POST") {
      epoch = Date.now().toString(36);
      seq = 0;
      buffer = [];
      res.end("restarted\n");
    } else {
      res.writeHead(404).end();
    }
  })
  .listen(8787, () => console.log("SSE server on http://localhost:8787"));
