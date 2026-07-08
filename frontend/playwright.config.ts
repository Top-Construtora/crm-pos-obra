import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // O front roda em Vite dev (instancia unica); paralelismo alto sobrecarrega
  // o servidor e gera flakiness. 2 workers equilibra velocidade e estabilidade.
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
