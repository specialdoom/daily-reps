import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: { proxy: { "/events": "http://localhost:8787", "/__drop": "http://localhost:8787", "/__restart": "http://localhost:8787" } },
});
