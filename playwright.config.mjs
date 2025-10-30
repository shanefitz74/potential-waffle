import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:4173',
    env: {
      PORT: '4173',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
