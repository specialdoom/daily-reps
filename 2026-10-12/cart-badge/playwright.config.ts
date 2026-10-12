import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Claude Code on the web ships Chromium here; elsewhere Playwright uses its own browser.
const preinstalled = "/opt/pw-browsers/chromium";
// BASE_URL points the suite at another running server (e.g. the before-review build).
const baseURL = process.env.BASE_URL ?? "http://localhost:4321";

export default defineConfig({
  testDir: "tests",
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    launchOptions: existsSync(preinstalled) ? { executablePath: preinstalled } : {},
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && node dist/server/entry.mjs",
        url: `${baseURL}/product`,
        reuseExistingServer: false,
      },
});
