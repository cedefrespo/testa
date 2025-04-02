export const environments = {
  production: {
    adminUrl: '{{baseUrl}}',
    webUrl: '{{baseUrl}}',
    betaUrl: '{{baseUrl}}',
    apiUrl: '{{apiUrl}}'
  },
  staging: {
    adminUrl: '{{baseUrl}}/staging',
    webUrl: '{{baseUrl}}/staging',
    betaUrl: '{{baseUrl}}/staging',
    apiUrl: '{{apiUrl}}/staging'
  },
  local: {
    adminUrl: 'http://localhost:5173',
    webUrl: 'http://localhost:5173',
    betaUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3000'
  }
};

export type Environment = 'production' | 'staging' | 'local';

export const getEnvironment = (env: Environment = 'local') => environments[env]; 