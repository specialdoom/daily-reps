import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// SOLUTION=before serves the demo page with the original element from
// ../../before-review, so the spec can be run against both versions.
const before = process.env.SOLUTION === "before";
const original = fileURLToPath(
  new URL("../before-review/product-card/src/product-card.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: before ? [{ find: "/src/product-card.ts", replacement: original }] : [],
    dedupe: ["lit"],
  },
  server: { fs: { allow: [".."] } },
});
