import { ReactNode } from 'react';
import { DSNav } from './DSNav';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
}

// Standard layout wrapper [FR-NAV-001, FR-NAV-003, FR-NAV-004]
export function Layout({ children, appName }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <DSNav appName={appName} />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
