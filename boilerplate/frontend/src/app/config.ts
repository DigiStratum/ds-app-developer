/**
 * App Configuration - Attachment Points
 * 
 * Modify this file for app-specific customization.
 */

export interface AppConfig {
  id: string;
  name: string;
  logo?: string;
  baseUrl: string;
  ssoUrl: string;
  menuItems?: { label: string; href: string; active?: boolean }[];
  footerLinks?: { label: string; url: string }[];
  features?: Record<string, boolean>;
}

const config: AppConfig = {
  id: 'myapp',
  name: 'My App',
  logo: '/assets/logo.svg',
  baseUrl: 'https://myapp.example.com',
  ssoUrl: 'https://account.example.com',
  menuItems: [],
  footerLinks: [
    { label: 'Privacy', url: '/privacy' },
    { label: 'Terms', url: '/terms' },
  ],
  features: {},
};

export default config;
