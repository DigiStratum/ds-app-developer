import { ReactNode } from 'react';
import { DeveloperAppShell } from '../boilerplate/DeveloperAppShell';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  appLogo?: string;
}

/**
 * App Layout - Wires boilerplate shell with app content
 * 
 * This is the app-specific Layout that can be customized.
 * Add app-specific header/footer slots here.
 */
export function Layout({ children, appName, appLogo }: LayoutProps) {
  return (
    <DeveloperAppShell
      appName={appName}
      appLogo={appLogo}
    >
      {children}
    </DeveloperAppShell>
  );
}

export default Layout;
