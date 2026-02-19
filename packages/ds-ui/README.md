# @digistratum/ds-ui

Shared UI component library for DigiStratum applications.

## Installation

```bash
npm install @digistratum/ds-ui
```

### Configure npm for GitHub Packages

Create or update `.npmrc` in your project root:

```
@digistratum:registry=https://npm.pkg.github.com
```

## Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install react react-dom react-i18next i18next
```

## Usage

### Basic Setup with DSLayout

```tsx
import { DSLayout, ThemeProvider, useTheme } from '@digistratum/ds-ui';
import '@digistratum/ds-ui/styles';

function App() {
  // Your auth context (from your app's auth implementation)
  const auth = {
    user: { id: '1', name: 'John', email: 'john@example.com', tenants: ['Acme Corp'] },
    currentTenant: null,
    isLoading: false,
    login: () => {},
    logout: () => {},
    switchTenant: (id: string | null) => {},
  };

  return (
    <ThemeProvider>
      <AppContent auth={auth} />
    </ThemeProvider>
  );
}

function AppContent({ auth }) {
  const theme = useTheme();

  return (
    <DSLayout 
      appName="My App" 
      currentAppId="myapp"
      auth={auth}
      theme={theme}
    >
      <h1>Welcome!</h1>
    </DSLayout>
  );
}
```

### Components

#### DSLayout

The main layout wrapper including navigation and footer.

```tsx
<DSLayout
  appName="My App"           // App name shown in nav
  currentAppId="myapp"       // Highlights current app in switcher
  auth={authContext}         // Auth context with user, logout, switchTenant
  theme={themeContext}       // Theme context from useTheme()
  apps={customApps}          // Optional: custom app list for switcher
  footerProps={{ ... }}      // Optional: customize footer
>
  {children}
</DSLayout>
```

#### DSNav

Standalone navigation component.

```tsx
<DSNav
  appName="My App"
  currentAppId="myapp"
  auth={authContext}
  theme={themeContext}
/>
```

#### Footer

Standalone footer component.

```tsx
<Footer
  copyrightHolder="My Company"
  links={[
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ]}
/>
```

#### TenantSwitcher

Standalone tenant switcher dropdown.

```tsx
<TenantSwitcher auth={authContext} />
```

#### UserMenu

Standalone user menu dropdown.

```tsx
<UserMenu
  user={user}
  onLogout={handleLogout}
  settingsUrl="/settings"
/>
```

#### ThemeToggle

Theme toggle button for light/dark mode.

```tsx
<ThemeToggle theme={themeContext} showLabel={true} />
```

### Hooks

#### useTheme

Access and control the theme.

```tsx
import { useTheme, ThemeProvider } from '@digistratum/ds-ui';

// Wrap your app with ThemeProvider
<ThemeProvider defaultTheme="system" storageKey="my-app-theme">
  <App />
</ThemeProvider>

// Use the hook anywhere inside
function Component() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme('dark')}>
      Current: {resolvedTheme}
    </button>
  );
}
```

#### useTranslation

Re-exported from react-i18next for consistent i18n usage.

```tsx
import { useTranslation } from '@digistratum/ds-ui';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('common.title')}</h1>;
}
```

## Styling

### CSS Variables

Import the base styles for CSS variables:

```tsx
import '@digistratum/ds-ui/styles';
```

Available CSS variables:

```css
:root {
  --ds-primary: #2563eb;
  --ds-primary-hover: #1d4ed8;
  --ds-secondary: #64748b;
  --ds-success: #22c55e;
  --ds-warning: #f59e0b;
  --ds-danger: #ef4444;
  --ds-bg: #ffffff;
  --ds-bg-secondary: #f9fafb;
  --ds-text: #111827;
  --ds-text-secondary: #6b7280;
  --ds-border: #e5e7eb;
}
```

### Tailwind CSS

The components are styled with Tailwind CSS classes. Make sure your Tailwind config includes dark mode:

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
}
```

Optionally extend with DS colors:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        ds: {
          primary: '#2563eb',
          secondary: '#64748b',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      }
    }
  }
}
```

## Translation Keys

The components use the following i18n keys (provide fallbacks):

```json
{
  "nav.personal": "Personal",
  "nav.switchTenant": "Switch Tenant",
  "nav.appSwitcher": "Switch app",
  "nav.dsApps": "DigiStratum Apps",
  "nav.current": "Current",
  "nav.menu": "Menu",
  "common.settings": "Settings",
  "common.logout": "Log out",
  "theme.light": "Light mode",
  "theme.dark": "Dark mode",
  "footer.copyright": "© {{year}} {{holder}}. All rights reserved."
}
```

## Types

All types are exported for TypeScript users:

```tsx
import type { 
  User, 
  AuthContext, 
  ThemeContext, 
  DSApp,
  DSLayoutProps,
  DSNavProps,
  FooterProps,
} from '@digistratum/ds-ui';
```

## Publishing

This package is published to GitHub Packages. To publish a new version:

```bash
npm version patch  # or minor, major
npm publish
```

Requires `GH_TOKEN` or npm authentication configured for GitHub Packages.
