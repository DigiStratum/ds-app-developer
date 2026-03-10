/**
 * Local Shell Adapter
 * 
 * Adapts local shell components to match the remote shell module interface.
 * Used as fallback when the remote shell is unavailable or in development mode.
 */
import { Layout } from '../app/Layout';
import { DSHeader, DSFooter, DSAppShell } from '@digistratum/layout';
import type { ShellModule } from './useRemoteShell';

export const localShellModule: ShellModule = {
  DSAppShell,
  DSHeader,
  DSFooter,
  Layout,
  DeveloperHeader: DSHeader as unknown as ShellModule['DeveloperHeader'],
  DeveloperFooter: DSFooter as unknown as ShellModule['DeveloperFooter'],
};

export { DSAppShell, Layout, DSHeader as DeveloperHeader, DSFooter as DeveloperFooter };
