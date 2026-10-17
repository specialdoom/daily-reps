import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

// Claude Code on the web ships Chromium at /opt/pw-browsers. On Windows, fall back to
// whichever full Chromium build is already in the Playwright cache (never `playwright install`).
function chromium(): string | undefined {
  if (existsSync("/opt/pw-browsers/chromium")) return "/opt/pw-browsers/chromium";
  const cache = join(homedir(), "AppData", "Local", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const build = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .pop();
  const exe = build && join(cache, build, "chrome-win64", "chrome.exe");
  return exe && existsSync(exe) ? exe : undefined;
}

const executablePath = chromium();

export default defineConfig({
  testMatch: "*.spec.ts",
  reporter: "list",
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 720 },
    launchOptions: executablePath ? { executablePath } : {},
  },
});
