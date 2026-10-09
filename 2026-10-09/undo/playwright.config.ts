import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Prefer the sandbox's preinstalled Chromium; locally fall back to Playwright's own download.
const executablePath = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4180',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: !process.env.CI,
  },
})
