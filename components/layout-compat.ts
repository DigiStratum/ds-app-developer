/**
 * Compatibility layer for @digistratum/layout imports
 * 
 * This re-exports from @digistratum/appshell for backwards compatibility.
 * Migration: Replace imports from '@digistratum/layout' with '@digistratum/appshell'
 */

// Re-export everything from appshell
export * from './appshell';

// Alias the main component (Layout was sometimes used as alias for AppShell)
export { AppShell as Layout } from './appshell';
export { AppShell as DSAppShell } from './appshell';
