/**
 * Local Shell Adapter
 * 
 * Adapts local shell components to match the remote shell module interface.
 * Used as fallback when the remote shell is unavailable or in development mode.
 * 
 * Part of App Shell Architecture (#911, #913, #914)
 */
import { Layout } from './Layout';
import { DeveloperHeader } from './DeveloperHeader';
import { DeveloperFooter } from './DeveloperFooter';
import type { ShellModule } from '../hooks/useRemoteShell';

/**
 * DSAppShell - Alias for Layout to match remote shell interface
 * 
 * In the remote shell, DSAppShell is the main wrapper component.
 * Locally, this is our Layout component.
 */
const DSAppShell = Layout;

/**
 * Local shell module export
 * 
 * Provides the same interface as the remote shell module,
 * allowing seamless fallback between remote and local shells.
 */
export const localShellModule: ShellModule = {
  DSAppShell,
  DSHeader: DeveloperHeader as unknown as ShellModule['DSHeader'],
  DSFooter: DeveloperFooter as unknown as ShellModule['DSFooter'],
  Layout,
  // Expose individual components for flexible usage
  DeveloperHeader,
  DeveloperFooter,
};

export { DSAppShell, Layout, DeveloperHeader, DeveloperFooter };
