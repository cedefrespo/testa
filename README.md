# Testa

A CLI tool for creating and managing test automation projects in a simple and structured way.

## Features

- Generation of automation projects with different frameworks (Playwright, Cypress, Selenium)
- Commands to create and manage tests
- TypeScript support
- Automatic environment configuration
- Templates for API, UI, WebSockets tests, and more
- Project structure organized following best practices
- Intelligent test generation through application analysis
- .env file auto-generation with sensible defaults

## Installation

```bash
npm install -g @fedecrespo/testa
```

## Quick Start

```bash
# Create a new test project
testa create my-app-tests

# Navigate to the project directory
cd my-app-tests

# Start interactive work session
testa start
```

## Command Reference

### Create a New Project

```bash
testa create my-project
# or shorter
testa new my-project
```

### Start Interactive Session

```bash
testa start
```

Launches an interactive menu with options to:
- Run tests
- Generate new tests
- Edit configuration
- View test reports
- Run in watch mode

### Initialize Tests in an Existing Project

```bash
testa init
```

### Generate Tests

```bash
# Create a new API test
testa generate api auth-test
# or shorter
testa g api auth-test

# Other test types
testa g e2e login-flow       # E2E/UI test
testa g ws notifications     # WebSocket test
testa g perf homepage        # Performance test
testa g visual dashboard     # Visual test

# Generate tests by analyzing your application
testa g api user-crud --analyze
testa g e2e components --analyze --target ./src/components
```

#### Smart Test Generation with Application Analysis

The `--analyze` flag enables Testa to analyze your application and create targeted tests:

```bash
# Analyze current directory and generate API tests
testa g api endpoints --analyze

# Analyze a specific directory
testa g e2e pages --analyze --target ./src/pages

# Create WebSocket tests by analyzing socket implementations
testa g ws realtime --analyze
```

What the analyzer does:

- For API tests: Finds API endpoints in Express/NestJS routes
- For E2E tests: Detects React/Vue components, routes, and forms
- For WebSocket tests: Locates WebSocket implementations and URLs

During analysis, Testa will:
1. Detect the framework (React, Vue, Express, etc.)
2. Find testable elements in your code
3. Present interactive prompts to select specific elements to test
4. Generate tailored tests for the selected elements

### Run Tests

```bash
# Run all tests
testa test
# or shorter
testa t

# Run specific test categories
testa test --auth            # Run auth tests
testa test --posts           # Run post operation tests
testa test --websocket       # Run WebSocket tests
testa test --redis           # Run Redis resilience tests

# Run on specific browser
testa test --browser firefox

# Run on mobile emulation
testa test --mobile

# Run in specific environment
testa test --env staging

# Show report after test run
testa test --report

# Combine options
testa test --auth --browser chrome --env production --report
```

## Project Structure

```
my-test-project/
├── src/
│   ├── api/            # API test utilities
│   ├── config/         # Environment configuration
│   ├── e2e/            # End-to-end tests
│   ├── models/         # Data models for tests
│   └── utils/          # Helper functions
├── playwright.config.ts # Playwright configuration
├── .env                # Environment variables (configured automatically)
└── package.json        # Dependencies and scripts
```

## Configuration

The `.env` file is automatically created with configuration based on your inputs:

```
# Test Environment (local, staging, production)
TEST_ENV=local

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin_password

# User Credentials
USER_EMAIL=user@example.com
USER_PASSWORD=user_password

# Base URLs
BASE_URL=http://localhost:5173
API_URL=http://localhost:3000

# Debug options (uncomment to enable)
# HEADLESS=false
# SLOWMO=100
```

## Workflow Example

```bash
# 1. Create a new test project
testa create my-app-tests

# 2. Navigate to the directory
cd my-app-tests

# 3. Generate a login test with application analysis
testa g e2e login-flow --analyze

# 4. Run the test
testa test --auth

# 5. View the test report
testa test --report
```

## Application Analysis Workflow

When using application analysis to create tests, the workflow is:

```bash
# 1. Navigate to your application directory
cd my-application

# 2. Generate tests by analyzing the application
testa g api endpoints --analyze

# 3. Follow the interactive prompts to select:
#    - Which endpoint/component/route to test
#    - Additional test parameters

# 4. Testa creates tailored tests specific to your application
```

## Available Templates

The generator includes templates for:

- **Playwright**: E2E tests with support for multiple browsers
  - Authentication Tests
  - API Tests
  - WebSocket Tests
  - Performance Tests
  - Visual Regression Tests

- **Cypress** (coming soon): Complete framework for UI testing

- **Selenium** (coming soon): Traditional browser testing framework

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the code:
   ```bash
   npm run build
   ```
4. Install locally for development:
   ```bash
   npm install -g .
   ```

## License

ISC 