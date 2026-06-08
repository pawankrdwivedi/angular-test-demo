import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';
import { configManager } from 'qe-framework-core';
import path from 'path';
import fs from 'fs';

const currentDir = process.cwd();
const isRoot = fs.existsSync(path.join(currentDir, 'app', 'package.json'));

if (!isRoot && path.basename(currentDir) !== 'app') {
  throw new Error('Playwright execution is only allowed from inside the "app" folder or project root.');
}

const baseAppPath = isRoot ? 'app' : '.';


// Load environment variables first
try {
  const searchPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'app', '.env'),
    path.join(process.cwd(), 'app.env'),
    path.join(process.cwd(), 'app', 'app.env')
  ];
  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
} catch (e) {
  // Ignore
}

// Load execution and UI config using the framework's ConfigManager
const execConfig = configManager.getExecutionConfig();
const uiConfig = configManager.getUiConfig();

// Map browser config to devices
const browserMap = {
  chromium: {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  firefox: {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  webkit: {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
};

const targetBrowser = (execConfig.browser || 'chromium').toLowerCase();
const activeProject = browserMap[targetBrowser] || browserMap.chromium;

const resultsDir = path.join(baseAppPath, process.env.DIR_TEST_RESULTS || 'test_results');

export default defineConfig({
  // Directory where Playwright searches for tests
  testDir: process.env.DIR_TEST || path.join(baseAppPath, 'test'),

  // Folder for test artifacts (screenshots, traces, videos, etc.)
  outputDir: path.join(resultsDir, 'playwright-artifacts'),

  // Timeout for each test in milliseconds
  timeout: execConfig.timeout,

  // Run all tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: execConfig.parallel,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(resultsDir, 'reports/playwright-html'), open: 'never' }],
    ['allure-playwright', { detail: true, resultsDir: path.join(resultsDir, 'allure-results') }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: uiConfig.baseUrl,

    // Collect trace, screenshot, and video options matching yaml configurations
    headless: execConfig.headless !== undefined ? execConfig.headless : true,
    screenshot: execConfig.screenshot || 'only-on-failure',
    video: execConfig.video || 'retain-on-failure',
    trace: execConfig.trace || 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    activeProject
  ],
});
