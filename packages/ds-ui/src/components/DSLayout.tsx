import { DSNav, DSNavFullProps } from './DSNav';
import { Footer, } from './Footer';
import type { FooterProps, DSLayoutProps } from '../types';

export interface DSLayoutFullProps extends DSLayoutProps {
  /** Auth context with user, tenant switching, logout */
  auth: DSNavFullProps['auth'];
  /** Theme context for light/dark toggle */
  theme: DSNavFullProps['theme'];
  /** Custom footer props */
  footerProps?: FooterProps;
  /** Custom apps for the app switcher */
  apps?: DSNavFullProps['apps'];
}

/**
 * Standard DigiStratum layout wrapper
 * [FR-NAV-001, FR-NAV-003, FR-NAV-004]
 * 
 * Provides:
 * - DSNav header with app switcher, tenant switcher, user menu
 * - Main content area with max-width container
 * - Footer with copyright and links
 */
export function DSLayout({ 
  children, 
  appName, 
  currentAppId,
  auth,
  theme,
  footerProps,
  apps,
}: DSLayoutFullProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <DSNav 
        appName={appName} 
        currentAppId={currentAppId} 
        auth={auth}
        theme={theme}
        apps={apps}
      />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer {...footerProps} />
    </div>
  );
}
