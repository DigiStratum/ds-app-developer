# Skeleton Components

This document describes the standardized, reusable components provided by the DS App Developer for building DigiStratum apps.

## Overview

The Skeleton provides two main standardized components:

1. **SkeletonHeader** - Configurable app header with navigation, auth, and app switching
2. **SkeletonFooter** - Configurable footer with GDPR banner and links

These components are designed to be configured via props rather than re-implemented by each app, ensuring consistency across the DS ecosystem.

## SkeletonHeader

A fully-featured header component that includes:

- **App switcher dropdown** - Grid icon that shows all DS apps
- **User menu** - Avatar with dropdown (profile, settings, logout)
- **Theme toggle** - Quick light/dark/system toggle
- **Tenant switcher** - For multi-tenant users
- **Mobile hamburger menu** - Responsive navigation
- **Custom menu items** - App-specific navigation

### Props

```tsx
interface SkeletonHeaderProps {
  appName: string;                    // Required: Display name for the app
  appLogo?: string;                   // Custom logo URL (falls back to tenant/DS default)
  currentAppId?: string;              // Highlights current app in switcher
  menuItems?: MenuItem[];             // Custom navigation items
  showAppSwitcher?: boolean;          // Show app switcher grid (default: true)
  showThemeToggle?: boolean;          // Show quick theme toggle (default: true)
  showUserMenu?: boolean;             // Show user menu (default: true)
  showPreferences?: boolean;          // Show preferences button (default: true)
  showTenantSwitcher?: boolean;       // Show tenant switcher (default: true)
  className?: string;                 // Additional CSS classes
}

interface MenuItem {
  label: string;
  path: string;
  icon?: ReactNode;
}
```

### Usage Examples

#### Minimal (All Defaults)

```tsx
import { SkeletonHeader } from '@/components';

function App() {
  return (
    <SkeletonHeader appName="My App" />
  );
}
```

#### Full Customization

```tsx
import { SkeletonHeader } from '@/components';
import { BoardIcon, SettingsIcon } from './icons';

function App() {
  return (
    <SkeletonHeader
      appName="DSKanban"
      appLogo="/kanban-logo.svg"
      currentAppId="dskanban"
      menuItems={[
        { label: 'Board', path: '/board', icon: <BoardIcon /> },
        { label: 'Backlog', path: '/backlog' },
        { label: 'Reports', path: '/reports' }
      ]}
      showAppSwitcher={true}
      showThemeToggle={true}
      showUserMenu={true}
    />
  );
}
```

#### Guest-Only Mode (No Auth)

```tsx
<SkeletonHeader
  appName="Public Site"
  showUserMenu={false}
  showTenantSwitcher={false}
/>
```

---

## SkeletonFooter

A footer component with built-in GDPR compliance:

- **GDPR consent banner** - Shows until user makes a choice, persists in localStorage
- **Copyright** - Auto-updates year
- **Standard links** - Privacy, Terms, Support
- **Custom links** - App-specific additions

### Props

```tsx
interface SkeletonFooterProps {
  appName: string;                    // Required: Used in copyright
  showGdprBanner?: boolean;           // Show GDPR banner if needed (default: true)
  showCopyright?: boolean;            // Show copyright line (default: true)
  showDefaultLinks?: boolean;         // Show Privacy/Terms/Support (default: true)
  extraLinks?: FooterLink[];          // Additional custom links
  className?: string;                 // Additional CSS classes
}

interface FooterLink {
  label: string;
  url: string;
}
```

### Usage Examples

#### Minimal (All Defaults)

```tsx
import { SkeletonFooter } from '@/components';

function App() {
  return (
    <SkeletonFooter appName="My App" />
  );
}
```

#### With Extra Links

```tsx
<SkeletonFooter
  appName="DSKanban"
  extraLinks={[
    { label: 'API Docs', url: '/docs' },
    { label: 'Status', url: 'https://status.digistratum.com' },
    { label: 'Changelog', url: '/changelog' }
  ]}
/>
```

#### Minimal Footer (No GDPR)

```tsx
<SkeletonFooter
  appName="Internal Tool"
  showGdprBanner={false}
  showDefaultLinks={false}
/>
```

---

## Layout Component

For most apps, use the `Layout` component which combines SkeletonHeader, SkeletonFooter, and the standard page structure:

```tsx
import { Layout } from '@/components';

function App() {
  return (
    <Layout
      appName="DSKanban"
      currentAppId="dskanban"
      menuItems={[
        { label: 'Board', path: '/board' },
        { label: 'Settings', path: '/settings' }
      ]}
      extraFooterLinks={[
        { label: 'API Docs', url: '/docs' }
      ]}
    >
      {/* Your page content */}
    </Layout>
  );
}
```

### Layout Props

```tsx
interface LayoutProps {
  children: ReactNode;
  appName?: string;                   // Default: 'DS App'
  appLogo?: string;
  currentAppId?: string;
  menuItems?: MenuItem[];
  extraFooterLinks?: FooterLink[];
  showAppSwitcher?: boolean;          // Default: true
  showThemeToggle?: boolean;          // Default: true
  showUserMenu?: boolean;             // Default: true
  showGdprBanner?: boolean;           // Default: true
}
```

---

## Standalone GDPR Banner

If you need the GDPR banner separately (not in footer), you can import it directly:

```tsx
import { GdprBanner } from '@/components';

function App() {
  return (
    <div>
      {/* Your content */}
      <GdprBanner />
    </div>
  );
}
```

The banner automatically:
- Shows only if user hasn't consented
- Offers "Accept All" or "Only Necessary" options
- Persists choice in localStorage (`ds-cookie-consent`)
- Hides after user makes a choice

---

## Consent Hook

Check consent status anywhere in your app:

```tsx
import { useConsent } from '@/hooks/useConsent';

function Analytics() {
  const { hasFullConsent, consentLevel } = useConsent();

  useEffect(() => {
    if (hasFullConsent) {
      // Load analytics, personalization, etc.
      initAnalytics();
    }
  }, [hasFullConsent]);

  return null;
}
```

### Hook Return Values

```tsx
{
  consentLevel: 'all' | 'essential' | null,  // Current consent level
  hasConsented: boolean,                      // User made any choice
  hasFullConsent: boolean,                    // User accepted all cookies
  setConsent: (level: 'all' | 'essential') => void,
  clearConsent: () => void,                   // For testing/settings
}
```

---

## CSS Variables

The components use CSS custom properties for theming. Key variables:

```css
:root {
  --ds-container-radius: 8px;    /* Border radius for containers */
  --ds-bg-margin: #f3f4f6;       /* Background between floating containers */
  --ds-primary: #2563eb;         /* Primary brand color */
}
```

Dark mode is handled via Tailwind's `dark:` prefix classes.

---

## Internationalization

All text strings use `react-i18next`. Key translation keys:

```json
{
  "nav.appSwitcher": "Switch app",
  "nav.dsApps": "DigiStratum Apps",
  "nav.current": "Current",
  "nav.personal": "Personal",
  "nav.menu": "Menu",
  "nav.theme": "Theme",
  "nav.toggleTheme": "Toggle theme",
  
  "auth.signIn": "Sign In",
  
  "cookies.title": "We use cookies to improve your experience",
  "cookies.message": "We use essential cookies for authentication...",
  "cookies.acceptAll": "Accept All",
  "cookies.onlyNecessary": "Only Necessary",
  "cookies.privacyPolicy": "Learn more in our Privacy Policy",
  
  "footer.copyright": "© {{year}} {{appName}}. All rights reserved.",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.support": "Support",
  
  "common.settings": "Settings",
  "common.logout": "Logout",
  
  "preferences.title": "Preferences"
}
```

---

## Migration from DSNav/Footer

If you're using the old `DSNav` and `Footer` components, migration is straightforward:

### Before

```tsx
import { DSNav } from '@/components/DSNav';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';

function App() {
  return (
    <div>
      <DSNav appName="My App" currentAppId="myapp" />
      <main>{/* content */}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
```

### After

```tsx
import { SkeletonHeader, SkeletonFooter } from '@/components';

function App() {
  return (
    <div>
      <SkeletonHeader appName="My App" currentAppId="myapp" />
      <main>{/* content */}</main>
      <SkeletonFooter appName="My App" />
    </div>
  );
}
```

Or even simpler with Layout:

```tsx
import { Layout } from '@/components';

function App() {
  return (
    <Layout appName="My App" currentAppId="myapp">
      {/* content */}
    </Layout>
  );
}
```

---

## Component Architecture

```
Layout
├── SkeletonHeader
│   ├── Logo (tenant-aware)
│   ├── Custom Menu Items
│   ├── App Switcher Dropdown
│   ├── Theme Toggle
│   ├── Preferences Button → PreferencesModal
│   ├── Tenant Switcher (if multi-tenant)
│   └── User Menu (or Sign In button)
│       ├── Profile link → DSAccount
│       ├── Settings link
│       └── Logout
├── AdSlot (header)
├── Main Content (children)
├── AdSlot (footer)
└── SkeletonFooter
    ├── GdprBanner (if not consented)
    ├── Copyright
    └── Links (Privacy, Terms, Support + custom)
```

All dropdown menus close on outside click. Mobile menu collapses all features into a hamburger menu with the same functionality.
