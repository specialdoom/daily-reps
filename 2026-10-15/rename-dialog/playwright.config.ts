import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Use a preinstalled Chromium; never `playwright install`.
const executablePath =
  process.env['PW_CHROMIUM'] ??
  [
    `${process.env['LOCALAPPDATA']}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`,
    '/opt/pw-browsers/chromium',
  ].find((path) => existsSync(path));

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4410',
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npx ng serve --port 4410',
    url: 'http://localhost:4410',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
