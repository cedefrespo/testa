# {{projectName}}

Automation tests for {{projectName}} project, generated with Testa.

## Requirements

- Node.js 14+
- npm or yarn
- Access to the application ({{baseUrl}})
- Test user credentials

## Quick Start

```bash
# Install dependencies
npm install

# Install browsers
npm run install:browsers

# Start interactive testing session
testa start
```

## Test Cases Covered

1. **Authentication & CORS**
   - Admin Panel Login
   - Mobile App Login
   - Session Persistence
   - Cross-Domain Access
   - Authentication Headers

2. **API**
   - Endpoint Validation
   - Error Handling
   - Response Validation

3. **User Interface**
   - UI Element Validation
   - Critical User Flows
   - Responsive Design

4. **WebSocket** (if selected)
   - Real-time Connections
   - Automatic Reconnection
   - Disconnection Handling

5. **Performance** (if selected)
   - Load Times
   - Behavior Under Load
   - Resource Optimization

6. **Visual Testing** (if selected)
   - Screenshot Comparison
   - Visual Change Detection
   - Validation Across Resolutions

## Configuration

The `.env` file has been automatically created with the following configuration:

```
# Test Environment (local, staging, production)
TEST_ENV=local

# Admin Credentials
ADMIN_EMAIL={{adminEmail}}
ADMIN_PASSWORD={{adminPassword}}

# User Credentials
USER_EMAIL={{userEmail}}
USER_PASSWORD={{userPassword}}

# Base URLs
BASE_URL={{baseUrl}}
API_URL={{apiUrl}}

# Debug options (uncomment to enable)
# HEADLESS=false
# SLOWMO=100
```

## Commands

All tests can be run using Testa commands:

```bash
# Run all tests
testa test

# Run specific test types
testa test --auth            # Authentication tests
testa test --posts           # Post operations tests
testa test --websocket       # WebSocket tests
testa test --redis           # Redis resilience tests

# Run tests in specific browsers
testa test --browser chrome
testa test --browser firefox
testa test --browser safari

# Run tests on mobile emulation
testa test --mobile

# Run tests in specific environments
testa test --env staging
testa test --env production

# Show test report
testa test --report

# Combine options
testa test --auth --browser firefox --env staging --report
```

## Generate Additional Tests

You can generate additional tests with:

```bash
# Generate API test
testa g api user-api

# Generate E2E/UI test
testa g e2e registration-flow

# Generate WebSocket test
testa g ws real-time-updates

# Generate Performance test
testa g perf image-loading

# Generate Visual test
testa g visual profile-page

# Generate tests with application analysis
testa g api user-api --analyze         # Analyze application and generate API tests
testa g e2e login-flow --analyze       # Analyze and generate E2E tests
```

### Smart Test Generation with Application Analysis

The `--analyze` flag allows Testa to scan your application code and generate targeted tests:

```bash
# For API tests - analyzes routes and endpoints
testa g api endpoints --analyze

# For E2E tests - analyzes components and pages
testa g e2e user-profile --analyze

# For WebSocket tests - analyzes socket implementations
testa g ws notifications --analyze
```

When using the analyze feature, Testa will:

1. Detect your application's framework and structure
2. Find testable elements like API endpoints, components, routes, and WebSockets
3. Provide interactive prompts to select specific elements to test
4. Generate tailored tests specifically for your application

## Project Structure

```
{{projectName}}/
├── src/
│   ├── api/            # API test utilities
│   ├── config/         # Environment configuration
│   ├── e2e/            # End-to-end tests
│   ├── models/         # Data models for tests
│   └── utils/          # Helper functions
├── playwright.config.ts # Playwright configuration
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

## Developer Notes

- For debugging tests, set `HEADLESS=false` and `SLOWMO=100` in your `.env` file.
- To run a specific test file: `testa test path/to/file.spec.ts`
- Tests run in parallel by default. You can adjust the `workers` parameter in `playwright.config.ts` if you encounter concurrency issues.
- When using `--analyze`, make sure you're in the correct directory of your application or use the `--target` option.

## License

ISC 