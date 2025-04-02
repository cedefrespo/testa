import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';

// Main function to analyze application structure
export async function analyzeApplication(appDir: string, testType: string): Promise<any> {
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
  
  if (Object.keys(appInfo.endpoints).length === 0 && 
      Object.keys(appInfo.components).length === 0 && 
      Object.keys(appInfo.routes).length === 0 &&
      !appInfo.hasWebSockets) {
    console.log('⚠️ Could not identify specific testable elements in the application');
    console.log('Will create a generic test template');
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
export function findFiles(dir: string, extensions: string[]): string[] {
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

// Helper functions for generating test content
export function generateApiTestForMethod(method: string, path: string): string {
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
export function generateApiErrorTestForMethod(method: string, path: string): string {
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
export function generateGenericUITest(testName: string): string {
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