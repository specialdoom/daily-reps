import http from "node:http";

const history = []; // { id, data }
let nextId = 1;
setInterval(() => {
  history.push({
    id: nextId,
    data: JSON.stringify({
      symbol: "ACME",
      price: +(100 + Math.random() * 5).toFixed(2),
    }),
  });
  nextId++;
  if (history.length > 200) history.shift();
}, 500);

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "access-control-allow-origin": "*",
    });
    const last = Number(req.headers["last-event-id"] ?? 0);
    let sent = last;
    const timer = setInterval(() => {
      for (const e of history) {
        if (e.id > sent) {
          const toWrite = `id: ${e.id}\ndata: ${e.data}\n\n`;
          console.log(toWrite);
          res.write(toWrite);
          sent = e.id;
        }
      }
      if (Math.random() < 0.05) {
        clearInterval(timer);
        res.destroy();
      } // simulate a drop
    }, 250);
    req.on("close", () => clearInterval(timer));
  })
  .listen(3001);
