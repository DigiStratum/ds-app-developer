/**
 * Minimal AppShell Demo
 * 
 * This demonstrates the bare AppShell with NO app-specific content.
 * The six zones:
 * 1. Custom header zone (optional) - hidden
 * 2. DSHeader (standard header)
 * 3. Header ad slot - hidden by default
 * 4. Main content (children) - placeholder
 * 5. Footer ad slot - hidden by default
 * 6. DSFooter (standard footer)
 */
import { ThemeProvider } from '@digistratum/ds-core';
import { AppShell } from '@digistratum/layout';

export default function App() {
  return (
    <ThemeProvider>
      <AppShell
        appName="DS Developer"
        currentAppId="dsdeveloper"
        showAppSwitcher={false}
        showThemeToggle={true}
        showUserMenu={false}
        showPreferences={true}
        showGdprBanner={true}
      >
        {/* Main content placeholder */}
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 dark:text-gray-400">
            Loading App...
          </p>
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
