import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1366, height: 768 } },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
