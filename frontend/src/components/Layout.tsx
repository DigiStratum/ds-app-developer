import { ReactNode } from 'react';
import { DSNav } from './DSNav';
import { Footer } from './Footer';
import { AdSlot } from './AdSlot';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  currentAppId?: string;  // Highlights current app in app-switcher
}

// Standard layout wrapper [FR-NAV-001, FR-NAV-003, FR-NAV-004]
// Layout structure: Header (rounded bottom) -> AdSlot -> Content (fully rounded) -> AdSlot -> Footer (rounded top)
// Page background is the margin color; containers float as distinct rounded elements
export function Layout({ children, appName, currentAppId }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ds-bg-margin)' }}>
      <DSNav appName={appName} currentAppId={currentAppId} />
      <AdSlot position="header" />
      <main 
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        style={{ borderRadius: 'var(--ds-container-radius)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <AdSlot position="footer" />
      <Footer />
    </div>
  );
}
