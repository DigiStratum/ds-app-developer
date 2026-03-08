/**
 * App Configuration - Attachment Points
 * 
 * This file defines how the app integrates with shell and boilerplate.
 * Modify this file for app-specific customization.
 * 
 * Shell and boilerplate will read these values at runtime.
 */
import type { MenuItem } from '@digistratum/layout';

export interface AppConfig {
  /** App identifier (used for app-switcher highlighting) */
  id: string;
  /** Display name */
  name: string;
  /** App logo URL */
  logo?: string;
  /** Base URL for this app */
  baseUrl: string;
  /** SSO provider URL */
  ssoUrl: string;
  /** App-specific menu items */
  menuItems?: MenuItem[];
  /** Footer links */
  footerLinks?: { label: string; url: string }[];
  /** Feature flags */
  features?: Record<string, boolean>;
}

const config: AppConfig = {
  id: 'dsdeveloper',
  name: 'DS Developer',
  logo: '/app/assets/logo.svg',
  baseUrl: 'https://developer.digistratum.com',
  ssoUrl: 'https://account.digistratum.com',
  menuItems: [
    // App-specific nav items go here
  ],
  footerLinks: [
    { label: 'Privacy', url: 'https://www.digistratum.com/privacy' },
    { label: 'Terms', url: 'https://www.digistratum.com/terms' },
    { label: 'Support', url: 'https://www.digistratum.com/support' },
  ],
  features: {
    adDemo: true,  // Developer-specific feature
  },
};

export default config;
