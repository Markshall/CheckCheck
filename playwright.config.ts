import { defineConfig, devices } from '@playwright/test';

// Browser tests for what the unit tests can't reach: the page itself, and
// the service worker that keeps it working offline. They run against the
// built app, as the service worker only runs there.
const PORT = 4175;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    ...devices['Pixel 7']
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
