import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './src/e2e',
  timeout: 60000,
  retries: 1,
  workers: 3,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Test files glob pattern
  testMatch: '**/*.spec.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: '{{baseUrl}}',
    
    // Collect trace when retrying failing tests
    trace: 'retain-on-failure',
    
    // Capture screenshot on test failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'on-first-retry',
    
    // Enable browser console output
    launchOptions: {
      args: ['--enable-logging']
    }
  },
  
  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] }
    }
  ]
};

export default config; 