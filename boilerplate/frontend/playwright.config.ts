import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for DS App Developer
 * 
 * See: https://playwright.dev/docs/test-configuration
 * Requirements: NFR-TEST-001
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (can adjust based on CI resources)
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    // JUnit for CI integration
    ...(process.env.CI ? [['junit', { outputFile: 'test-results/junit.xml' }] as const] : []),
  ],

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    // Collect trace when retrying a failed test
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: process.env.CI ? 'on-first-retry' : 'off',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Timeout for actions (click, fill, etc.)
    actionTimeout: 10000,

    // Ignore HTTPS errors (for local dev)
    ignoreHTTPSErrors: true,
  },

  // Global timeout for each test
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Configure projects for major browsers
  projects: [
    // Desktop Chrome - primary target
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Mobile Safari - important for responsive testing
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    // Optional: Firefox and WebKit can be added for broader coverage
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
