/**
 * Local Shell Adapter
 * 
 * Adapts local shell components to match the remote shell module interface.
 * Used as fallback when the remote shell is unavailable or in development mode.
 */
import { Layout } from '../app/Layout';
import { DeveloperHeader } from '../boilerplate/DeveloperHeader';
import { DeveloperFooter } from '../boilerplate/DeveloperFooter';
import type { ShellModule } from './useRemoteShell';

const DSAppShell = Layout;

export const localShellModule: ShellModule = {
  DSAppShell,
  DSHeader: DeveloperHeader as unknown as ShellModule['DSHeader'],
  DSFooter: DeveloperFooter as unknown as ShellModule['DSFooter'],
  Layout,
  DeveloperHeader,
  DeveloperFooter,
};

export { DSAppShell, Layout, DeveloperHeader, DeveloperFooter };
