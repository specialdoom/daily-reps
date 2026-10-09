import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Prefer the sandbox's preinstalled Chromium; locally fall back to Playwright's own download.
const executablePath = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4179',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npm run build-only && npx vite preview --port 4179 --strictPort',
    url: 'http://localhost:4179',
    reuseExistingServer: !process.env.CI,
  },
})
