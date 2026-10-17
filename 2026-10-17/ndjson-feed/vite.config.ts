import { defineConfig, type Plugin } from "vite";

// Mock server: streams 300 NDJSON events in randomly sized chunks that are cut at
// arbitrary BYTE offsets (so they split lines and multi-byte UTF-8 characters).
function ndjsonMock(): Plugin {
  return {
    name: "ndjson-mock",
    configureServer(server) {
      server.middlewares.use("/api/events", (req, res) => {
        const url = new URL(req.url ?? "", "http://x");
        const trailingNewline = url.searchParams.get("trailingNewline") !== "0";
        const fail = url.searchParams.get("fail") === "1";

        const words = ["café", "naïve", "日本語", "😀 party", "résumé", "plain"];
        const lines: string[] = [];
        for (let i = 1; i <= 300; i++) {
          lines.push(JSON.stringify({ id: i, text: `${words[i % words.length]} #${i}` }));
          if (i === 50) lines.push(""); // a blank line the client must skip
        }
        let body = lines.join("\n");
        if (trailingNewline) body += "\n";
        const bytes = Buffer.from(body, "utf8");

        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        let offset = 0;
        let seed = 7;
        const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        let closed = false;
        res.on("close", () => { closed = true; });

        const tick = () => {
          if (closed) return;
          if (fail && offset > bytes.length / 2) return void res.destroy();
          if (offset >= bytes.length) return void res.end();
          const size = 1 + Math.floor(rand() * 40);
          res.write(bytes.subarray(offset, offset + size));
          offset += size;
          setTimeout(tick, 15);
        };
        tick();
      });
    },
  };
}

export default defineConfig({ plugins: [ndjsonMock()] });
