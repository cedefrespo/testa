export interface User {
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export const testUsers = {
  admin: {
    email: process.env.ADMIN_EMAIL || '{{adminEmail}}',
    password: process.env.ADMIN_PASSWORD || '{{adminPassword}}',
    role: 'admin' as 'admin'
  },
  regularUser: {
    email: process.env.USER_EMAIL || '{{userEmail}}',
    password: process.env.USER_PASSWORD || '{{userPassword}}',
    role: 'user' as 'user'
  }
}; 