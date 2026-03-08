/**
 * App-Specific Code
 * 
 * This directory contains app-specific implementations.
 * Shell and boilerplate directories should NOT be modified for app customization.
 * 
 * Structure:
 * - config.ts    - Attachment points (name, logo, menu items, etc.)
 * - pages/       - App pages
 * - features/    - App-specific features
 * - assets/      - App assets (logos, images)
 */

export { default as config } from './config';
export type { AppConfig } from './config';

// Pages
export { HomePage } from './pages/Home';
export { DashboardPage } from './pages/Dashboard';
