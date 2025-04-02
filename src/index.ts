#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import * as analyzer from './analyzer';
import { 
  generateApiTestForMethod, 
  generateApiErrorTestForMethod, 
  generateGenericUITest 
} from './analyzer';

const program = new Command();

// Define placeholders centralmente
const PLACEHOLDERS = {
  PROJECT_NAME: '{{projectName}}',
  BASE_URL: '{{baseUrl}}',
  API_URL: '{{apiUrl}}',
  ADMIN_EMAIL: '{{adminEmail}}',
  ADMIN_PASSWORD: '{{adminPassword}}',
  USER_EMAIL: '{{userEmail}}',
  USER_PASSWORD: '{{userPassword}}'
};

// Version of the tool
const VERSION = '1.0.0';

program
  .name('testa')
  .description('CLI tool for creating and managing test automation projects')
  .version(VERSION);

// Command to create a new test project
program
  .command('create <projectName>')
  .alias('new')
  .description('Create a new test automation project')
  .option('-t, --type <type>', 'Project type (e2e, api, full)', 'full')
  .option('-f, --framework <framework>', 'Test framework (playwright, cypress, selenium)', 'playwright')
  .action(async (projectName, options) => {
    console.log(`🚀 Creating a new test project "${projectName}" using ${options.framework}...`);
    
    // Prompt for additional information
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'What is the base URL of the application?',
        default: 'http://localhost:3000'
      },
      {
        type: 'input',
        name: 'apiUrl',
        message: 'What is the API URL?',
        default: 'http://localhost:3000/api'
      },
      {
        type: 'confirm',
        name: 'useTypescript',
        message: 'Do you want to use TypeScript?',
        default: true
      },
      {
        type: 'input',
        name: 'adminEmail',
        message: 'Admin user email for tests',
        default: 'admin@example.com'
      },
      {
        type: 'input',
        name: 'adminPassword',
        message: 'Admin user password',
        default: 'admin_password'
      },
      {
        type: 'input',
        name: 'userEmail',
        message: 'Regular user email for tests',
        default: 'user@example.com'
      },
      {
        type: 'input',
        name: 'userPassword',
        message: 'Regular user password',
        default: 'user_password'
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select the features you want to include:',
        choices: [
          { name: 'Authentication Tests', value: 'auth', checked: true },
          { name: 'API Tests', value: 'api', checked: true },
          { name: 'UI Tests', value: 'ui', checked: true },
          { name: 'WebSocket Tests', value: 'websocket' },
          { name: 'Performance Tests', value: 'performance' },
          { name: 'Visual Regression Tests', value: 'visual' }
        ]
      }
    ]);
    
    // Create the project
    createProject(projectName, { ...options, ...answers });
  });

// Command to initialize tests in an existing project
program
  .command('init')
  .description('Initialize tests in an existing project')
  .option('-f, --framework <framework>', 'Test framework (playwright, cypress, selenium)', 'playwright')
  .action(async (options) => {
    console.log(`🔍 Initializing tests in the current project using ${options.framework}...`);
    
    // Check if we're in a Node.js project (package.json exists)
    if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
      console.error('❌ No package.json file found. This command must be run in the root of a Node.js project.');
      process.exit(1);
    }
    
    // Reuse functionality from the create command, but for the current directory
    const projectName = path.basename(process.cwd());
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'What is the base URL of the application?',
        default: 'http://localhost:3000'
      },
      {
        type: 'input',
        name: 'apiUrl',
        message: 'What is the API URL?',
        default: 'http://localhost:3000/api'
      },
      {
        type: 'confirm',
        name: 'useTypescript',
        message: 'Do you want to use TypeScript?',
        default: true
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select the features you want to include:',
        choices: [
          { name: 'Authentication Tests', value: 'auth', checked: true },
          { name: 'API Tests', value: 'api', checked: true },
          { name: 'UI Tests', value: 'ui', checked: true },
          { name: 'WebSocket Tests', value: 'websocket' },
          { name: 'Performance Tests', value: 'performance' },
          { name: 'Visual Regression Tests', value: 'visual' }
        ]
      }
    ]);
    
    // Create directory structure for tests in the existing project
    initTestingInExistingProject(process.cwd(), { ...options, ...answers });
  });

// Command to generate a new test
program
  .command('generate <testType> <testName>')
  .alias('g')
  .description('Generate a new test')
  .option('-f, --feature <feature>', 'Feature the test belongs to')
  .option('-a, --analyze', 'Analyze the application structure to create targeted tests', false)
  .option('-t, --target <target>', 'Target application directory to analyze (defaults to current directory)')
  .action(async (testType, testName, options) => {
    console.log(`✨ Generating a new ${testType} test: ${testName}`);
    
    // Check if we should analyze the application structure
    if (options.analyze) {
      const targetDir = options.target || process.cwd();
      console.log(`🔍 Analyzing application in ${targetDir} to create targeted tests...`);
      
      try {
        const appInfo = await analyzer.analyzeApplication(targetDir, testType);
        generateTest(testType, testName, { ...options, appInfo });
      } catch (err) {
        const error = err as Error;
        console.error(`❌ Error analyzing application: ${error.message}`);
        
        // Ask user if they want to generate a generic test instead
        const { generateGeneric } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'generateGeneric',
            message: 'Would you like to generate a generic test template instead?',
            default: true
          }
        ]);
        
        if (generateGeneric) {
          generateTest(testType, testName, options);
        }
      }
    } else {
      generateTest(testType, testName, options);
    }
  });

// Command to run tests
program
  .command('run [testPattern]')
  .alias('r')
  .description('Run tests (can specify a pattern to run specific tests)')
  .option('-e, --env <environment>', 'Environment to run tests in (local, staging, production)', 'local')
  .option('-b, --browser <browser>', 'Browser to run tests in (chrome, firefox, safari)', 'chrome')
  .action((testPattern, options) => {
    console.log(`🧪 Running tests${testPattern ? ` matching "${testPattern}"` : ''} in ${options.env} environment`);
    
    runTests(testPattern, options);
  });

// Command to start work on a test project
program
  .command('start')
  .description('Start working on a test project')
  .option('-o, --open', 'Open in browser or editor')
  .action(async (options) => {
    console.log('🚀 Starting a work session on the test project...');
    
    // Check if we're in the root of a test project
    const isTestProject = fs.existsSync(path.join(process.cwd(), 'package.json')) && 
                        (fs.existsSync(path.join(process.cwd(), 'playwright.config.ts')) || 
                         fs.existsSync(path.join(process.cwd(), 'cypress.json')) ||
                         fs.existsSync(path.join(process.cwd(), 'jest.config.js')));
    
    if (!isTestProject) {
      console.log('⚠️ You don\'t seem to be in the root of a test project.');
      
      // Ask if they want to create a new project
      const { createNew } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createNew',
          message: 'Do you want to create a new test project?',
          default: true
        }
      ]);
      
      if (createNew) {
        const { projectName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: 'my-test-project'
          }
        ]);
        
        // Call the create command
        const createCommand = program.commands.find(cmd => cmd.name() === 'create');
        if (createCommand) {
          await createCommand.parseAsync([process.argv[0], process.argv[1], 'create', projectName]);
        }
      } else {
        console.log('👋 Goodbye!');
      }
      
      return;
    }
    
    // Test project detected, offer options
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const projectName = packageJson.name;
    
    console.log(`📋 Project: ${projectName}`);
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: '🧪 Run tests', value: 'run' },
          { name: '✨ Generate a new test', value: 'generate' },
          { name: '📝 Edit configuration', value: 'config' },
          { name: '📊 View test reports', value: 'report' },
          { name: '🔍 Run in watch mode', value: 'watch' }
        ]
      }
    ]);
    
    switch (action) {
      case 'run':
        // Ask what type of tests to run
        const { testType } = await inquirer.prompt([
          {
            type: 'list',
            name: 'testType',
            message: 'What tests do you want to run?',
            choices: [
              { name: 'All tests', value: 'all' },
              { name: 'API tests', value: 'api' },
              { name: 'UI tests', value: 'e2e' },
              { name: 'WebSocket tests', value: 'websocket' }
            ]
          }
        ]);
        
        let testPattern = '';
        
        if (testType !== 'all') {
          testPattern = `src/${testType} tests/${testType}`;
        }
        
        runTests(testPattern, { env: 'local', browser: 'chrome' });
        break;
        
      case 'generate':
        // Ask what type of test to generate
        const { genTestType, testName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'genTestType',
            message: 'What type of test do you want to generate?',
            choices: [
              { name: 'API', value: 'api' },
              { name: 'UI/E2E', value: 'e2e' },
              { name: 'WebSocket', value: 'websocket' },
              { name: 'Performance', value: 'performance' },
              { name: 'Visual', value: 'visual' }
            ]
          },
          {
            type: 'input',
            name: 'testName',
            message: 'Test name:',
            default: 'my-test'
          }
        ]);
        
        generateTest(genTestType, testName, {});
        break;
        
      case 'config':
        // Open the configuration in the default editor
        let configFile = '';
        
        if (fs.existsSync(path.join(process.cwd(), 'playwright.config.ts'))) {
          configFile = 'playwright.config.ts';
        } else if (fs.existsSync(path.join(process.cwd(), 'cypress.json'))) {
          configFile = 'cypress.json';
        } else if (fs.existsSync(path.join(process.cwd(), 'jest.config.js'))) {
          configFile = 'jest.config.js';
        }
        
        if (configFile) {
          console.log(`📝 Opening ${configFile} in your editor...`);
          
          try {
            // Try to open with VSCode, if that fails use the default editor
            execSync(`code ${configFile}`, { stdio: 'ignore' });
          } catch (error) {
            if (process.platform === 'darwin') { // macOS
              execSync(`open ${configFile}`);
            } else if (process.platform === 'win32') { // Windows
              execSync(`start ${configFile}`);
            } else { // Linux and others
              execSync(`xdg-open ${configFile}`);
            }
          }
        } else {
          console.log('⚠️ No configuration file found.');
        }
        break;
        
      case 'report':
        // Check if reports exist and show them
        const reportDir = path.join(process.cwd(), 'playwright-report');
        
        if (fs.existsSync(reportDir)) {
          console.log('📊 Opening test report...');
          execSync('npx playwright show-report', { stdio: 'inherit' });
        } else {
          console.log('⚠️ No reports found. Run the tests first.');
        }
        break;
        
      case 'watch':
        // Run tests in watch mode
        console.log('🔍 Running tests in watch mode...');
        
        try {
          // Detect the framework and run in watch mode
          if (fs.existsSync(path.join(process.cwd(), 'playwright.config.ts'))) {
            // Playwright doesn't have native watch mode, but we can simulate with nodemon
            execSync('npx nodemon --watch src --watch tests --exec "npx playwright test"', { stdio: 'inherit' });
          } else if (fs.existsSync(path.join(process.cwd(), 'cypress.json'))) {
            execSync('npx cypress open', { stdio: 'inherit' });
          } else if (fs.existsSync(path.join(process.cwd(), 'jest.config.js'))) {
            execSync('npx jest --watch', { stdio: 'inherit' });
          } else {
            console.log('⚠️ No compatible framework detected for watch mode.');
          }
        } catch (error) {
          // Ignore user interruption errors
          console.log('⏹️ Watch mode ended.');
        }
        break;
    }
  });

// Command to run tests
program
  .command('test [pattern]')
  .alias('t')
  .description('Run tests')
  .option('-e, --env <environment>', 'Environment to run tests in (local, staging, production)', 'local')
  .option('-b, --browser <browser>', 'Browser to run tests in (chrome, firefox, safari, all)', 'chrome')
  .option('-a, --auth', 'Run only authentication tests')
  .option('-p, --posts', 'Run only post tests')
  .option('-w, --websocket', 'Run only WebSocket tests')
  .option('-r, --redis', 'Run only Redis resilience tests')
  .option('-m, --mobile', 'Run tests in mobile device emulation')
  .option('--report', 'Show report after tests')
  .action((pattern, options) => {
    console.log(`🧪 Running tests...`);
    
    // Detect test type based on options
    let testPattern = pattern || '';
    if (options.auth) testPattern = 'auth.spec.ts';
    if (options.posts) testPattern = 'posts.spec.ts';
    if (options.websocket) testPattern = 'websocket.spec.ts';
    if (options.redis) testPattern = 'redis.spec.ts';
    
    // Detect browser
    let browserOption = '';
    if (options.browser && options.browser !== 'all') {
      browserOption = `--project=${options.browser}`;
    }
    
    // Detect environment
    const envVar = `TEST_ENV=${options.env}`;
    
    // Build command
    let cmd = '';
    
    // Determine framework
    if (fs.existsSync(path.join(process.cwd(), 'playwright.config.ts')) || 
        fs.existsSync(path.join(process.cwd(), 'playwright.config.js'))) {
      
      cmd = `${envVar} npx playwright test ${testPattern} ${browserOption} ${options.mobile ? '--project=mobile-chrome --project=mobile-safari' : ''}`;
      
      // Run tests
      try {
        execSync(cmd, { stdio: 'inherit' });
        
        // Show report if requested
        if (options.report) {
          console.log('📊 Showing test report...');
          execSync('npx playwright show-report', { stdio: 'inherit' });
        }
        
        console.log('✅ Tests completed successfully');
      } catch (error) {
        console.error('❌ Some tests have failed');
        
        // Show report even if failed, when requested
        if (options.report) {
          console.log('📊 Showing test report...');
          execSync('npx playwright show-report', { stdio: 'inherit' });
        }
        
        process.exit(1);
      }
    } else {
      console.error('❌ No compatible test framework detected.');
      process.exit(1);
    }
  });

async function createProject(projectName: string, options: any) {
  const projectPath = path.resolve(process.cwd(), projectName);
  
  // Create project directory
  fs.mkdirSync(projectPath, { recursive: true });
  
  // Create standard directory structure
  const dirs = [
    'src/api',
    'src/config',
    'src/e2e',
    'src/utils',
    'src/models',
    'temp'
  ];
  
  if (options.features.includes('websocket')) {
    dirs.push('src/websocket');
  }
  
  if (options.features.includes('performance')) {
    dirs.push('src/performance');
  }
  
  if (options.features.includes('visual')) {
    dirs.push('src/visual');
  }
  
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  }
  
  // Copy template files based on framework and options
  const templatePath = path.join(__dirname, '../templates', options.framework);
  
  // If templates directory doesn't exist, create basic files
  if (!fs.existsSync(templatePath)) {
    createBasicFiles(projectPath, options);
  } else {
    // Copy template files
    fs.copySync(templatePath, projectPath);
    
    // Replace placeholders in files
    const filesToProcess = getAllFiles(projectPath);
    for (const file of filesToProcess) {
      if (file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.md') || 
          file.endsWith('.example') || file.endsWith('.txt') || file.endsWith('.html')) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Replace all placeholders
        content = content
          .replace(new RegExp(PLACEHOLDERS.PROJECT_NAME, 'g'), projectName)
          .replace(new RegExp(PLACEHOLDERS.BASE_URL, 'g'), options.baseUrl)
          .replace(new RegExp(PLACEHOLDERS.API_URL, 'g'), options.apiUrl)
          .replace(new RegExp(PLACEHOLDERS.ADMIN_EMAIL, 'g'), options.adminEmail || '')
          .replace(new RegExp(PLACEHOLDERS.ADMIN_PASSWORD, 'g'), options.adminPassword || '')
          .replace(new RegExp(PLACEHOLDERS.USER_EMAIL, 'g'), options.userEmail || '')
          .replace(new RegExp(PLACEHOLDERS.USER_PASSWORD, 'g'), options.userPassword || '');
        
        fs.writeFileSync(file, content);
      }
    }
  }
  
  // Create .env file
  const envContent = `# Test Environment (local, staging, production)
TEST_ENV=local

# Admin Credentials
ADMIN_EMAIL=${options.adminEmail}
ADMIN_PASSWORD=${options.adminPassword}

# User Credentials
USER_EMAIL=${options.userEmail}
USER_PASSWORD=${options.userPassword}

# Base URLs
BASE_URL=${options.baseUrl}
API_URL=${options.apiUrl}

# Debug options (uncomment to enable)
# HEADLESS=false
# SLOWMO=100
`;

  fs.writeFileSync(path.join(projectPath, '.env'), envContent);
  
  // Initialize npm project
  process.chdir(projectPath);
  execSync('npm init -y', { stdio: 'inherit' });
  
  // Install dependencies based on framework
  let installCmd = 'npm install --save-dev ';
  
  if (options.framework === 'playwright') {
    installCmd += 'playwright @playwright/test';
    if (options.useTypescript) {
      installCmd += ' typescript ts-node @types/node';
    }
  } else if (options.framework === 'cypress') {
    installCmd += 'cypress';
    if (options.useTypescript) {
      installCmd += ' typescript @types/node';
    }
  } else if (options.framework === 'selenium') {
    installCmd += 'selenium-webdriver';
    if (options.useTypescript) {
      installCmd += ' typescript ts-node @types/node @types/selenium-webdriver';
    }
  }
  
  execSync(installCmd, { stdio: 'inherit' });
  
  // Add common utilities
  execSync('npm install --save-dev axios jest dotenv', { stdio: 'inherit' });
  
  // Initialize framework if needed
  if (options.framework === 'playwright') {
    execSync('npx playwright install', { stdio: 'inherit' });
  } else if (options.framework === 'cypress') {
    execSync('npx cypress open', { stdio: 'inherit' });
  }
  
  console.log(`✅ Project ${projectName} created successfully!`);
  console.log(`\nTo get started:\n`);
  console.log(`  cd ${projectName}`);
  
  // Mention .env configuration
  console.log(`  # A .env file has been created with default values`);
  console.log(`  # You may need to update:`);
  console.log(`  #  - Admin credentials (ADMIN_EMAIL, ADMIN_PASSWORD)`);
  console.log(`  #  - User credentials (USER_EMAIL, USER_PASSWORD)`);
  console.log(`  #  - Base URLs (BASE_URL, API_URL) if they differ from what you configured\n`);
  
  console.log(`  testa start\n`);
}

// Function to initialize testing in an existing project
function initTestingInExistingProject(projectPath: string, options: any) {
  console.log(`📁 Creating directory structure for tests in ${projectPath}...`);
  
  // Create standard directory structure
  const dirs = [
    'tests/api',
    'tests/config',
    'tests/e2e',
    'tests/utils',
    'tests/models',
    'tests/temp'
  ];
  
  if (options.features.includes('websocket')) {
    dirs.push('tests/websocket');
  }
  
  if (options.features.includes('performance')) {
    dirs.push('tests/performance');
  }
  
  if (options.features.includes('visual')) {
    dirs.push('tests/visual');
  }
  
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  }
  
  // Create basic configuration files
  if (options.framework === 'playwright') {
    const playwrightConfig = `
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: '${options.baseUrl}',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure'
  }
};

export default config;
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'playwright.config.ts'),
      playwrightConfig
    );
    
    // Create a sample test
    const sampleTest = `
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('/');
  expect(await page.title()).not.toBe('');
});
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'tests/e2e/basic.spec.ts'),
      sampleTest
    );
  }
  
  // Create .env file
  const envContent = `# Test Environment (local, staging, production)
TEST_ENV=local

# Admin Credentials
ADMIN_EMAIL=${options.adminEmail || 'admin@example.com'}
ADMIN_PASSWORD=${options.adminPassword || 'admin_password'}

# User Credentials
USER_EMAIL=${options.userEmail || 'user@example.com'}
USER_PASSWORD=${options.userPassword || 'user_password'}

# Base URLs
BASE_URL=${options.baseUrl}
API_URL=${options.apiUrl}

# Debug options (uncomment to enable)
# HEADLESS=false
# SLOWMO=100
`;

  fs.writeFileSync(path.join(projectPath, '.env'), envContent);
  
  // Update package.json to add testing scripts
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add testing scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    "test": options.framework === 'playwright' ? 'playwright test' : 
            options.framework === 'cypress' ? 'cypress run' : 'jest',
    "test:e2e": options.framework === 'playwright' ? 'playwright test tests/e2e' : 
               options.framework === 'cypress' ? 'cypress run' : 'jest tests/e2e',
    "test:api": options.framework === 'playwright' ? 'playwright test tests/api' : 
               options.framework === 'cypress' ? 'cypress run --spec "tests/api/**"' : 'jest tests/api'
  };
  
  // Save changes to package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Install dependencies
  console.log('📦 Installing dependencies...');
  
  let installCmd = 'npm install --save-dev ';
  
  if (options.framework === 'playwright') {
    installCmd += 'playwright @playwright/test';
    if (options.useTypescript) {
      installCmd += ' typescript ts-node @types/node';
    }
  } else if (options.framework === 'cypress') {
    installCmd += 'cypress';
    if (options.useTypescript) {
      installCmd += ' typescript @types/node';
    }
  } else if (options.framework === 'selenium') {
    installCmd += 'selenium-webdriver';
    if (options.useTypescript) {
      installCmd += ' typescript ts-node @types/node @types/selenium-webdriver';
    }
  }
  
  execSync(installCmd, { stdio: 'inherit' });
  
  // Add common utilities
  execSync('npm install --save-dev axios jest dotenv', { stdio: 'inherit' });
  
  console.log('✅ Project configured successfully for testing!');
  console.log('\nTo run the tests:');
  console.log('  npm test');
  
  // Mention .env file
  console.log('\nA .env file has been created with default values.');
  console.log('Make sure to update it with your actual credentials and URLs.');
}

// Function to generate a new test
function generateTest(testType: string, testName: string, options: any) {
  // Determine the appropriate location for the test
  let targetDir: string;
  
  switch (testType.toLowerCase()) {
    case 'api':
      targetDir = 'api';
      break;
    case 'e2e':
    case 'ui':
      targetDir = 'e2e';
      break;
    case 'websocket':
    case 'ws':
      targetDir = 'websocket';
      break;
    case 'performance':
    case 'perf':
      targetDir = 'performance';
      break;
    case 'visual':
      targetDir = 'visual';
      break;
    default:
      targetDir = testType;
  }
  
  // Determine if the project uses the standard structure or a custom one
  let basePath = fs.existsSync(path.join(process.cwd(), 'src/e2e')) ? 
                'src' : 
                fs.existsSync(path.join(process.cwd(), 'tests/e2e')) ? 
                'tests' : '';
  
  if (!basePath) {
    console.error('❌ No valid test structure detected in the project.');
    console.log('Run "testa init" first to set up the test structure.');
    process.exit(1);
  }
  
  const testDir = path.join(process.cwd(), basePath, targetDir);
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // File name format
  const fileName = testName.includes('.spec.') ? 
                  testName : 
                  `${testName.replace(/\s+/g, '-').toLowerCase()}.spec.ts`;
  
  const testPath = path.join(testDir, fileName);
  
  // Check if the file already exists
  if (fs.existsSync(testPath)) {
    console.log(`⚠️ The test ${fileName} already exists. Generating alternate version...`);
    const altFileName = `${testName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.spec.ts`;
    const altTestPath = path.join(testDir, altFileName);
    generateTestContent(altTestPath, testType, testName, options);
  } else {
    generateTestContent(testPath, testType, testName, options);
  }
}

// Function to generate test content based on its type
function generateTestContent(testPath: string, testType: string, testName: string, options: any) {
  let template = '';
  const appInfo = options.appInfo;
  
  // Create content based on test type
  switch (testType.toLowerCase()) {
    case 'api':
      if (appInfo && appInfo.selectedEndpoint) {
        const endpoint = appInfo.selectedEndpoint;
        const method = endpoint.method.toLowerCase();
        
        template = `import { test, expect } from '@playwright/test';
import axios from 'axios';

test.describe('${testName}', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  
  test('should successfully ${method} to ${endpoint.path}', async () => {
    ${analyzer.generateApiTestForMethod(method, endpoint.path)}
  });
  
  test('should handle errors correctly', async () => {
    try {
      // Simulate an error condition (e.g., invalid parameters, unauthorized)
      ${analyzer.generateApiErrorTestForMethod(method, endpoint.path)}
      // If we get here, the request was successful when it should fail
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error.response.status).toBe(400); // Adjust expected error code as needed
    }
  });
});`;
      } else {
        // Fallback to generic API test
        template = `import { test, expect } from '@playwright/test';
import axios from 'axios';

test.describe('${testName}', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
  
  test('should return successful response', async () => {
    const response = await axios.get(\`\${baseUrl}/endpoint\`);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });
  
  test('should handle errors correctly', async () => {
    try {
      await axios.get(\`\${baseUrl}/invalid-endpoint\`);
      // If we get here, the request was successful when it should fail
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error.response.status).toBe(404);
    }
  });
});`;
      }
      break;
    
    case 'e2e':
    case 'ui':
      if (appInfo) {
        if (appInfo.testTarget === 'route' && appInfo.selectedRoute) {
          const route = appInfo.selectedRoute.path;
          
          template = `import { test, expect } from '@playwright/test';

test.describe('${testName} - ${route}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${route}');
  });
  
  test('should load the page successfully', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp('${route.replace(/:/g, '[^/]+')}'));
    await expect(page).not.toHaveTitle(/Error|404|Not Found/i);
  });
  
  test('should display expected elements', async ({ page }) => {
    // Check for common UI elements that should be present
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Add more specific element checks
  });
});`;
        } else if (appInfo.testTarget === 'component' && appInfo.selectedComponent) {
          const component = appInfo.selectedComponent.name;
          
          template = `import { test, expect } from '@playwright/test';

test.describe('${testName} - ${component} Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page containing the component
    await page.goto('/');
  });
  
  test('should render the ${component} component', async ({ page }) => {
    // Assuming the component has a data-testid attribute or unique selector
    await expect(page.locator('[data-testid="${component.toLowerCase()}"]')).toBeVisible();
    // Add more specific assertions for the component
  });
  
  test('should interact correctly', async ({ page }) => {
    // Test interactions with the component
    // Example: clicking, typing, etc.
  });
});`;
        } else if (appInfo.testTarget === 'form') {
          const formPath = appInfo.formPath || '/';
          
          template = `import { test, expect } from '@playwright/test';

test.describe('${testName} - Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${formPath}');
  });
  
  test('should display the form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  
  test('should submit the form successfully', async ({ page }) => {
    // Fill out the form fields
    // Add appropriate selectors and values for your form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify submission was successful
    // This depends on your application's behavior after submission
    await expect(page.locator('.success-message')).toBeVisible();
  });
  
  test('should validate form inputs', async ({ page }) => {
    // Submit form without filling required fields
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('.error-message')).toBeVisible();
  });
});`;
        } else if (appInfo.testUrl) {
          const url = appInfo.testUrl;
          
          template = `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${url}');
  });
  
  test('should load page successfully', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp('${url}'));
    await expect(page).not.toHaveTitle(/Error|404|Not Found/i);
  });
  
  test('should display key UI elements', async ({ page }) => {
    // Check for common UI elements that should be present
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Add specific element checks based on the URL
  });
});`;
        } else {
          // Fallback to generic UI test
          template = analyzer.generateGenericUITest(testName);
        }
      } else {
        // Fallback to generic UI test
        template = analyzer.generateGenericUITest(testName);
      }
      break;
    
    case 'websocket':
    case 'ws':
      if (appInfo && appInfo.socketUrl) {
        const socketUrl = appInfo.socketUrl;
        
        template = `import { test, expect } from '@playwright/test';
import WebSocket from 'ws';

test.describe('${testName}', () => {
  let client: WebSocket;
  
  test.beforeEach(() => {
    client = new WebSocket('${socketUrl}');
  });
  
  test.afterEach(() => {
    client.close();
  });
  
  test('should establish connection', async () => {
    return new Promise<void>((resolve) => {
      client.on('open', () => {
        expect(client.readyState).toBe(WebSocket.OPEN);
        resolve();
      });
    });
  });
  
  test('should send and receive message', async () => {
    return new Promise<void>((resolve, reject) => {
      client.on('open', () => {
        client.send(JSON.stringify({ type: 'test', content: 'message' }));
      });
      
      client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          expect(message).toBeDefined();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      // Add timeout for test failure
      setTimeout(() => {
        reject(new Error('Timed out waiting for response'));
      }, 5000);
    });
  });
  
  test('should handle disconnection properly', async () => {
    return new Promise<void>((resolve) => {
      client.on('open', () => {
        client.close();
      });
      
      client.on('close', () => {
        expect(client.readyState).toBe(WebSocket.CLOSED);
        resolve();
      });
    });
  });
});`;
      } else {
        // Default WebSocket test
        template = `import { test, expect } from '@playwright/test';
import WebSocket from 'ws';

test.describe('${testName}', () => {
  let client: WebSocket;
  
  test.beforeEach(() => {
    client = new WebSocket('ws://localhost:3000/ws');
  });
  
  test.afterEach(() => {
    client.close();
  });
  
  test('should establish connection', async () => {
    return new Promise<void>((resolve) => {
      client.on('open', () => {
        expect(client.readyState).toBe(WebSocket.OPEN);
        resolve();
      });
    });
  });
  
  test('should send and receive message', async () => {
    return new Promise<void>((resolve) => {
      client.on('open', () => {
        client.send(JSON.stringify({ type: 'test', content: 'message' }));
      });
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message).toBeDefined();
        resolve();
      });
    });
  });
});`;
      }
      break;
    
    case 'performance':
    case 'perf':
      template = `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test('should load page in less than 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    const loadTime = Date.now() - startTime;
    console.log(\`Load time: \${loadTime}ms\`);
    
    expect(loadTime).toBeLessThan(3000);
  });
  
  test('should have good performance score', async ({ page }) => {
    // This test is a placeholder. To implement it fully,
    // consider using Lighthouse or similar tools
    await page.goto('/');
    
    // Simulate performance check
    const performanceMetrics = await page.evaluate(() => {
      return {
        score: 90,
        firstContentfulPaint: 800,
        timeToInteractive: 1500
      };
    });
    
    expect(performanceMetrics.score).toBeGreaterThan(80);
  });
});`;
      break;
    
    case 'visual':
      template = `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test('should have correct appearance on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // Take screenshot and compare with baseline
    expect(await page.screenshot()).toMatchSnapshot('desktop.png');
  });
  
  test('should have correct appearance on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Take screenshot and compare with baseline
    expect(await page.screenshot()).toMatchSnapshot('mobile.png');
  });
});`;
      break;
    
    default:
      template = `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test('basic test', async ({ page }) => {
    await page.goto('/');
    expect(await page.title()).not.toBe('');
  });
});`;
  }
  
  // Write template to file
  fs.writeFileSync(testPath, template);
  
  console.log(`✅ Test generated successfully at ${testPath}`);
}

// Helper function to generate API test for a specific method
function generateApiTestForMethod(method: string, path: string): string {
  switch (method) {
    case 'get':
      return `const response = await axios.get(\`\${baseUrl}${path}\`);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();`;
    
    case 'post':
      return `const payload = {
      // Add appropriate request body
      name: 'Test Name',
      email: 'test@example.com'
    };
    
    const response = await axios.post(\`\${baseUrl}${path}\`, payload);
    
    expect(response.status).toBe(201); // or 200 depending on your API
    expect(response.data).toBeDefined();`;
    
    case 'put':
      return `const payload = {
      // Add appropriate request body
      id: 1,
      name: 'Updated Name',
      email: 'updated@example.com'
    };
    
    const response = await axios.put(\`\${baseUrl}${path}\`, payload);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();`;
    
    case 'delete':
      return `const response = await axios.delete(\`\${baseUrl}${path}\`);
    
    expect(response.status).toBe(200); // or 204 for No Content
    expect(response.data).toBeDefined();`;
    
    case 'patch':
      return `const payload = {
      // Add partial data to update
      name: 'Patched Name'
    };
    
    const response = await axios.patch(\`\${baseUrl}${path}\`, payload);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();`;
    
    default:
      return `const response = await axios.get(\`\${baseUrl}${path}\`);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();`;
  }
}

// Helper function to generate API error test for a specific method
function generateApiErrorTestForMethod(method: string, path: string): string {
  switch (method) {
    case 'get':
      return `await axios.get(\`\${baseUrl}${path}?invalid=true\`);`;
    
    case 'post':
      return `await axios.post(\`\${baseUrl}${path}\`, {
        // Send invalid data
        invalid_field: true
      });`;
    
    case 'put':
      return `await axios.put(\`\${baseUrl}${path}\`, {
        // Send invalid data
        invalid_field: true
      });`;
    
    case 'delete':
      return `await axios.delete(\`\${baseUrl}${path}/999999\`); // Non-existent ID`;
    
    case 'patch':
      return `await axios.patch(\`\${baseUrl}${path}\`, {
        // Send invalid data
        invalid_field: true
      });`;
    
    default:
      return `await axios.get(\`\${baseUrl}${path}/invalid\`);`;
  }
}

// Generic UI test template
function generateGenericUITest(testName: string): string {
  return `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('should display the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Expected Title/);
  });
  
  test('should allow basic interaction', async ({ page }) => {
    // Replace with appropriate selector for your application
    const button = page.locator('button:visible').first();
    await button.click();
    
    // Add assertions based on expected behavior after clicking
  });
  
  test('should navigate correctly', async ({ page }) => {
    // Find a navigation element (like a menu item or link)
    const navLink = page.locator('nav a').first();
    await navLink.click();
    
    // Verify navigation worked
    await expect(page).not.toHaveURL('/');
  });
});`;
}

// New function to analyze application structure
async function analyzeApplication(appDir: string, testType: string): Promise<any> {
  const appInfo: any = {
    endpoints: [],
    components: [],
    routes: [],
    apiRoutes: [],
    hasForms: false,
    hasAuthentication: false,
    hasWebSockets: false
  };
  
  // Check what kind of application we're dealing with
  const hasPackageJson = fs.existsSync(path.join(appDir, 'package.json'));
  if (!hasPackageJson) {
    throw new Error('No package.json found. Is this a Node.js project?');
  }
  
  // Read package.json to identify the tech stack
  const packageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Detect framework
  appInfo.framework = detectFramework(dependencies);
  
  console.log(`📋 Detected framework: ${appInfo.framework || 'Unknown'}`);
  
  // Determine what to analyze based on test type
  if (testType.toLowerCase() === 'api') {
    // Look for API endpoints
    await analyzeApiEndpoints(appDir, appInfo);
  } else if (testType.toLowerCase() === 'e2e' || testType.toLowerCase() === 'ui') {
    // Look for UI components and routes
    await analyzeUiStructure(appDir, appInfo);
  } else if (testType.toLowerCase() === 'websocket' || testType.toLowerCase() === 'ws') {
    // Look for WebSocket implementations
    await analyzeWebSockets(appDir, appInfo);
  }
  
  if (Object.keys(appInfo).length === 0) {
    throw new Error('Could not identify any testable elements in the application');
  }
  
  return appInfo;
}

// Detect framework from dependencies
function detectFramework(dependencies: Record<string, string>): string {
  if (dependencies.react) return 'React';
  if (dependencies.vue) return 'Vue';
  if (dependencies.angular) return 'Angular';
  if (dependencies.express) return 'Express';
  if (dependencies.next) return 'Next.js';
  if (dependencies.nuxt) return 'Nuxt.js';
  if (dependencies.nest) return 'NestJS';
  if (dependencies['@nestjs/core']) return 'NestJS';
  return 'Unknown';
}

// Analyze API endpoints
async function analyzeApiEndpoints(appDir: string, appInfo: any): Promise<void> {
  console.log('🔍 Looking for API endpoints...');
  
  // Check for Express routes
  const expressRoutesPattern = /app\.(get|post|put|delete|patch)\s*\(\s*['"](\/[^'"]*)['"]/g;
  const nestRoutesPattern = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"](\/[^'"]*)['"]/g;
  
  // Find all JavaScript/TypeScript files
  const files = findFiles(appDir, ['.js', '.ts', '.jsx', '.tsx']);
  
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Express routes detection
    let match;
    while ((match = expressRoutesPattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      appInfo.endpoints.push({ method, path, file });
    }
    
    // NestJS routes detection
    while ((match = nestRoutesPattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      appInfo.endpoints.push({ method, path, file });
    }
    
    // Check for authentication endpoints
    if (content.includes('login') || content.includes('signin') || 
        content.includes('authenticate') || content.includes('auth')) {
      appInfo.hasAuthentication = true;
    }
  }
  
  // If we found endpoints, ask which one to test
  if (appInfo.endpoints.length > 0) {
    console.log(`✅ Found ${appInfo.endpoints.length} API endpoints`);
    
    const { selectedEndpoint } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedEndpoint',
        message: 'Which endpoint would you like to test?',
        choices: appInfo.endpoints.map((endpoint: any) => ({
          name: `${endpoint.method} ${endpoint.path}`,
          value: endpoint
        }))
      }
    ]);
    
    appInfo.selectedEndpoint = selectedEndpoint;
  } else {
    console.log('⚠️ No API endpoints detected. Will create a generic API test.');
    
    // Ask for manual endpoint information
    const { manualEndpoint, manualMethod } = await inquirer.prompt([
      {
        type: 'input',
        name: 'manualEndpoint',
        message: 'Please enter an API endpoint to test (e.g., /api/users):',
        default: '/api/endpoint'
      },
      {
        type: 'list',
        name: 'manualMethod',
        message: 'Select the HTTP method:',
        choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET'
      }
    ]);
    
    appInfo.selectedEndpoint = {
      method: manualMethod,
      path: manualEndpoint,
      file: null
    };
  }
}

// Analyze UI structure
async function analyzeUiStructure(appDir: string, appInfo: any): Promise<void> {
  console.log('🔍 Looking for UI components and routes...');
  
  // Check framework-specific patterns
  if (appInfo.framework === 'React' || appInfo.framework === 'Next.js') {
    // Look for components
    const componentFiles = findFiles(appDir, ['.jsx', '.tsx']);
    const componentPattern = /export\s+(default\s+)?((function|const|class)\s+([A-Z][a-zA-Z0-9]*)|([A-Z][a-zA-Z0-9]*))/g;
    
    for (const file of componentFiles) {
      if (!fs.existsSync(file)) continue;
      
      const content = fs.readFileSync(file, 'utf8');
      let match;
      
      while ((match = componentPattern.exec(content)) !== null) {
        const componentName = match[4] || match[5];
        if (componentName) {
          appInfo.components.push({
            name: componentName,
            file
          });
        }
      }
      
      // Check for forms
      if (content.includes('<form') || content.includes('<Form') || 
          content.includes('onSubmit') || content.includes('handleSubmit')) {
        appInfo.hasForms = true;
      }
    }
    
    // Look for routes
    const routePattern = /<Route\s+path=["'](\/[^"']*)["']/g;
    const nextRoutePattern = /\s+path:\s*["'](\/[^"']*)["']/g;
    
    for (const file of componentFiles) {
      if (!fs.existsSync(file)) continue;
      
      const content = fs.readFileSync(file, 'utf8');
      let match;
      
      // React Router routes
      while ((match = routePattern.exec(content)) !== null) {
        const path = match[1];
        appInfo.routes.push({ path, file });
      }
      
      // Next.js routes
      while ((match = nextRoutePattern.exec(content)) !== null) {
        const path = match[1];
        appInfo.routes.push({ path, file });
      }
    }
    
    // Check for pages directory (Next.js)
    const pagesDir = path.join(appDir, 'pages');
    if (fs.existsSync(pagesDir)) {
      const pageFiles = findFiles(pagesDir, ['.js', '.jsx', '.ts', '.tsx']);
      
      for (const file of pageFiles) {
        // Convert file path to route
        const relativePath = path.relative(pagesDir, file);
        const route = '/' + relativePath
          .replace(/\.(js|jsx|ts|tsx)$/, '')
          .replace(/\/index$/, '')
          .replace(/\[([^\]]+)\]/g, ':$1');
        
        if (route !== '/') {
          appInfo.routes.push({ path: route, file });
        }
      }
    }
  }
  
  // If we found components or routes, ask which one to test
  if (appInfo.components.length > 0 || appInfo.routes.length > 0) {
    console.log(`✅ Found ${appInfo.components.length} components and ${appInfo.routes.length} routes`);
    
    // Ask whether to test a component or a route
    const { testTarget } = await inquirer.prompt([
      {
        type: 'list',
        name: 'testTarget',
        message: 'What would you like to test?',
        choices: [
          { name: 'A specific component', value: 'component', disabled: appInfo.components.length === 0 },
          { name: 'A route/page', value: 'route', disabled: appInfo.routes.length === 0 },
          { name: 'A form submission', value: 'form', disabled: !appInfo.hasForms },
          { name: 'General UI test', value: 'general' }
        ]
      }
    ]);
    
    appInfo.testTarget = testTarget;
    
    if (testTarget === 'component' && appInfo.components.length > 0) {
      const { selectedComponent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedComponent',
          message: 'Which component would you like to test?',
          choices: appInfo.components.map((component: any) => ({
            name: component.name,
            value: component
          }))
        }
      ]);
      
      appInfo.selectedComponent = selectedComponent;
    } else if (testTarget === 'route' && appInfo.routes.length > 0) {
      const { selectedRoute } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedRoute',
          message: 'Which route would you like to test?',
          choices: appInfo.routes.map((route: any) => ({
            name: route.path,
            value: route
          }))
        }
      ]);
      
      appInfo.selectedRoute = selectedRoute;
    } else if (testTarget === 'form') {
      const { formPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'formPath',
          message: 'Enter the path to the page with the form:',
          default: '/'
        }
      ]);
      
      appInfo.formPath = formPath;
    }
  } else {
    console.log('⚠️ No UI components or routes detected. Will create a generic UI test.');
    
    // Ask for a URL to test
    const { testUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'testUrl',
        message: 'Enter a URL path to test (e.g., /login):',
        default: '/'
      }
    ]);
    
    appInfo.testUrl = testUrl;
  }
}

// Analyze WebSocket implementations
async function analyzeWebSockets(appDir: string, appInfo: any): Promise<void> {
  console.log('🔍 Looking for WebSocket implementations...');
  
  // Look for websocket imports and usages
  const files = findFiles(appDir, ['.js', '.ts', '.jsx', '.tsx']);
  const socketPatterns = [
    /\b(WebSocket|ws|socket\.io|socketio|sock)\b/i,
    /new\s+WebSocket\s*\(\s*["']([^"']*)["']/g,
    /io\s*\(\s*["']([^"']*)["']/g,
    /socket\.connect\s*\(\s*["']([^"']*)["']/g
  ];
  
  let socketImplementations: any[] = [];
  
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    
    for (const pattern of socketPatterns) {
      if (pattern instanceof RegExp) {
        if (typeof pattern.exec === 'function') {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            if (match[1]) {
              socketImplementations.push({
                file,
                url: match[1]
              });
            }
          }
        } else if (pattern.test(content)) {
          appInfo.hasWebSockets = true;
          socketImplementations.push({ file });
        }
      }
    }
  }
  
  if (socketImplementations.length > 0) {
    console.log(`✅ Found ${socketImplementations.length} WebSocket implementations`);
    appInfo.socketImplementations = socketImplementations;
    
    const uniqueUrls = [...new Set(socketImplementations
      .filter(impl => impl.url)
      .map(impl => impl.url))];
    
    if (uniqueUrls.length > 0) {
      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: 'Which WebSocket URL would you like to test?',
          choices: uniqueUrls
        }
      ]);
      
      appInfo.socketUrl = selectedUrl;
    } else {
      // Ask for manual WebSocket URL
      const { manualSocketUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'manualSocketUrl',
          message: 'Enter the WebSocket URL to test:',
          default: 'ws://localhost:3000/ws'
        }
      ]);
      
      appInfo.socketUrl = manualSocketUrl;
    }
  } else {
    console.log('⚠️ No WebSocket implementations detected. Will create a generic WebSocket test.');
    
    // Ask for manual WebSocket URL
    const { manualSocketUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'manualSocketUrl',
        message: 'Enter the WebSocket URL to test:',
        default: 'ws://localhost:3000/ws'
      }
    ]);
    
    appInfo.socketUrl = manualSocketUrl;
  }
}

// Helper function to find files with specific extensions
function findFiles(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  let result: string[] = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, .git and similar directories
      if (entry.name === 'node_modules' || entry.name === '.git' || 
          entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      
      result = result.concat(findFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      result.push(fullPath);
    }
  }
  
  return result;
}

program.parse(process.argv); 