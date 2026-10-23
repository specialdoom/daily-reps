import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 5173;

const CITIES = [
  "Amsterdam", "Athens", "Barcelona", "Berlin", "Bern", "Brussels", "Bucharest",
  "Budapest", "Copenhagen", "Dublin", "Edinburgh", "Helsinki", "Lisbon", "Ljubljana",
  "London", "Madrid", "Milan", "Munich", "Oslo", "Paris", "Prague", "Rome",
  "Stockholm", "Vienna", "Warsaw", "Zagreb", "Zurich",
];

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Short queries match many rows, so they are slow: the response to "b" can
// arrive after the response to "ber". That is the point of the challenge.
const delayFor = (q: string) => Math.max(100, 1200 - q.length * 350);

const send = (res: import("node:http").ServerResponse, type: string, body: string) => {
  res.writeHead(200, { "content-type": type });
  res.end(body);
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname === "/") {
    return send(res, "text/html; charset=utf-8", await readFile(`${root}index.html`, "utf8"));
  }
  if (url.pathname === "/htmx.js") {
    return send(res, "text/javascript", await readFile(`${root}node_modules/htmx.org/dist/htmx.min.js`, "utf8"));
  }
  if (url.pathname === "/search") {
    const q = (url.searchParams.get("q") ?? "").trim();
    await new Promise((r) => setTimeout(r, delayFor(q)));
    const hits = CITIES.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
    const items = hits.map((c) => `<li>${escape(c)}</li>`).join("");
    return send(res, "text/html; charset=utf-8",
      `<p>${hits.length} result(s) for “${escape(q)}”</p><ul>${items}</ul>`);
  }
  res.writeHead(404).end("Not found");
}).listen(port, () => console.log(`http://localhost:${port}`));
