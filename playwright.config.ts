import { defineConfig } from '@playwright/test'

export default defineConfig({
  // Use project root for browsers in production
  use: {
    // Configure browser launch options for serverless environments
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  },
  // Configure browser installation path
  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] }
    }
  ],
  // Timeout settings for serverless
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  // Retry settings
  retries: process.env.NODE_ENV === 'production' ? 2 : 0,
  // Workers for serverless
  workers: process.env.NODE_ENV === 'production' ? 1 : undefined
})