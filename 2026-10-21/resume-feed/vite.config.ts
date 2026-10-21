import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // Forward /events to the Hono mock server (npm run server).
    proxy: { "/events": "http://localhost:8787" },
  },
});
