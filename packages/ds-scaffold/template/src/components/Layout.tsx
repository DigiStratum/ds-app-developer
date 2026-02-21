import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  appName?: string;
}

/**
 * Standard layout wrapper
 * 
 * Provides:
 * - Header with navigation, auth controls, theme toggle
 * - Main content area with max-width container
 * - Footer with copyright and links
 * 
 * Uses DS design system variables for consistent styling.
 */
export function Layout({ children, appName = '{{APP_NAME}}' }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ds-bg-margin)' }}>
      {/* Header */}
      <header 
        className="ds-container-margins bg-white dark:bg-gray-800"
        style={{ 
          borderBottomLeftRadius: 'var(--ds-container-radius)', 
          borderBottomRightRadius: 'var(--ds-container-radius)' 
        }}
      >
        <Header appName={appName} />
      </header>
      
      {/* Main Content */}
      <main 
        className="ds-container-margins flex-1 bg-white dark:bg-gray-800 my-2"
        style={{ borderRadius: 'var(--ds-container-radius)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer 
        className="ds-container-margins bg-white dark:bg-gray-800"
        style={{ 
          borderTopLeftRadius: 'var(--ds-container-radius)', 
          borderTopRightRadius: 'var(--ds-container-radius)' 
        }}
      >
        <Footer appName={appName} />
      </footer>
    </div>
  );
}
