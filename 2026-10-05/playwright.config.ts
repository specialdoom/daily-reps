import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Claude Code on the web ships Chromium here; elsewhere Playwright uses its own browser.
const preinstalled = "/opt/pw-browsers/chromium";

export default defineConfig({
  testMatch: "*.spec.ts",
  reporter: "list",
  use: {
    browserName: "chromium",
    launchOptions: existsSync(preinstalled)
      ? { executablePath: preinstalled }
      : {},
  },
});
