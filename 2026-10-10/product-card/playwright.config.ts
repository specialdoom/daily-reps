import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Use an already-installed Chromium; never download one.
function chromium(): string | undefined {
  if (existsSync("/opt/pw-browsers/chromium")) return "/opt/pw-browsers/chromium";
  const cache = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const builds = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .reverse();
  for (const build of builds) {
    const exe = join(cache, build, "chrome-win64", "chrome.exe");
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

export default defineConfig({
  testDir: ".",
  testMatch: "product-card.spec.ts",
  reporter: "list",
  use: {
    baseURL: "http://localhost:5179",
    launchOptions: { executablePath: chromium() },
  },
  webServer: {
    command: "vite --port 5179 --strictPort",
    url: "http://localhost:5179",
    reuseExistingServer: false,
  },
});
