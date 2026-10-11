import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["*.spec.ts"],
    exclude: ["before-review/**", "node_modules/**"],
  },
});
