import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Unit/integration tests are co-located under src/. The Playwright E2E
    // specs in tests/ run via `npm run test:e2e`, not vitest — exclude them so
    // vitest doesn't try to load @playwright/test.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // `server-only` throws outside an RSC bundle; stub it so server-side
      // logic helpers (e.g. lib/actions/_org) can be unit-tested.
      'server-only': resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
