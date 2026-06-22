import { defineConfig, devices } from '@playwright/test'

// Target URL: defaults to the local dev server, but set E2E_BASE_URL to run the
// suite against a deployed Vercel Preview (Supabase branch DB) or Production.
//   E2E_BASE_URL=https://<branch>-yieldbase.vercel.app npm run test:e2e
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const isRemote = !!process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
  // Only boot a local dev server when targeting localhost. Against a remote
  // (Preview/Prod) URL there is nothing to start.
  webServer: isRemote
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
})
