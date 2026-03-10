/**
 * Local Shell Adapter
 * 
 * Adapts local shell components to match the remote shell module interface.
 * Used as fallback when the remote shell is unavailable or in development mode.
 */
import { Layout } from '../app/Layout';
import { DSHeader, DSFooter, DSAppShell } from '@digistratum/layout';
import type { ShellModule } from './useRemoteShell';

// Type assertions via unknown needed because:
// - ShellModule uses loose types (Record<string, unknown>) for CDN module compatibility
// - Actual components have strict prop requirements
// This is safe because Layout/App.tsx ensures correct props are passed
export const localShellModule: ShellModule = {
  DSAppShell: DSAppShell as unknown as ShellModule['DSAppShell'],
  DSHeader: DSHeader as unknown as ShellModule['DSHeader'],
  DSFooter: DSFooter as unknown as ShellModule['DSFooter'],
  Layout: Layout as unknown as ShellModule['Layout'],
  DeveloperHeader: DSHeader as unknown as ShellModule['DSHeader'],
  DeveloperFooter: DSFooter as unknown as ShellModule['DSFooter'],
};

export { DSAppShell, Layout, DSHeader as DeveloperHeader, DSFooter as DeveloperFooter };
