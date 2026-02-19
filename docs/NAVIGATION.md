# Navigation Component Pattern

> Standard navigation components for DigiStratum applications.
> All DS apps should use these components to maintain ecosystem consistency.

---

## Overview

The navigation system consists of three main components:

| Component | File | Purpose |
|-----------|------|---------|
| `DSNav` | `components/DSNav.tsx` | Header with app-switcher, tenant switcher, user menu |
| `Footer` | `components/Footer.tsx` | Standard footer with copyright and links |
| `Layout` | `components/Layout.tsx` | Page wrapper combining DSNav + content + Footer |

## Requirements Mapping

| Requirement | Component | Implementation |
|-------------|-----------|----------------|
| FR-NAV-001 | DSNav | Logo (upper-left), app name, user menu |
| FR-NAV-002 | DSNav | App-switcher grid icon showing DS ecosystem apps |
| FR-NAV-003 | Footer | Copyright year, Privacy/Terms/Support links |
| FR-NAV-004 | DSNav, Layout | Mobile hamburger menu, responsive breakpoints |
| FR-TENANT-002 | DSNav | Tenant switcher dropdown |
| FR-THEME-001 | DSNav | Theme toggle (sun/moon icons) |

---

## Usage

### Basic Layout

```tsx
import { Layout } from './components';

function App() {
  return (
    <Layout appName="My DS App">
      <DashboardPage />
    </Layout>
  );
}
```

### With App Switcher Context

Pass `currentAppId` to highlight the current app in the switcher:

```tsx
import { Layout } from './components';

function App() {
  return (
    <Layout appName="DSKanban" currentAppId="dskanban">
      <DashboardPage />
    </Layout>
  );
}
```

Note: Update the `Layout` component to pass `currentAppId` to `DSNav`:

```tsx
// In Layout.tsx
export function Layout({ children, appName, currentAppId }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <DSNav appName={appName} currentAppId={currentAppId} />
      <main className="flex-1">...</main>
      <Footer />
    </div>
  );
}
```

---

## DSNav Component

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | `string` | `'DS App'` | Application name shown in header |
| `currentAppId` | `string?` | `undefined` | Highlights current app in switcher |

### Features

#### App Switcher (FR-NAV-002)

Grid icon in upper-left opens a dropdown showing available DigiStratum apps:

- **DSAccount** - User account management
- **DSKanban** - Project/issue tracking
- **DSDocs** - Documentation

Current app is highlighted with a "Current" badge.

To add new apps, update the `DS_APPS` constant in `DSNav.tsx`:

```tsx
const DS_APPS = [
  { id: 'dsaccount', name: 'DSAccount', url: 'https://account.digistratum.com', icon: '👤' },
  { id: 'dskanban', name: 'DSKanban', url: 'https://kanban.digistratum.com', icon: '📋' },
  { id: 'dsdocs', name: 'DSDocs', url: 'https://docs.digistratum.com', icon: '📄' },
  // Add new apps here
];
```

#### Tenant Switcher (FR-TENANT-002)

Dropdown showing user's tenants. Only visible when user belongs to multiple tenants.

- "Personal" option for personal data view
- Organization names from `user.tenants[]`
- Current tenant is highlighted
- Changes sync to `X-Tenant-ID` header via `api.setTenant()`

#### User Menu

Avatar dropdown with:

- User name and email display
- Settings link
- Logout button (triggers SSO logout flow)

#### Theme Toggle (FR-THEME-001)

Sun/moon icon that toggles between light and dark themes.

- Persists preference to `localStorage`
- Respects system preference when set to "system"

#### Responsive Design (FR-NAV-004)

- **Desktop (sm+):** Full nav with all dropdowns inline
- **Mobile (<sm):** Hamburger menu expands to full-width panel
  - User info at top
  - Tenant switcher as button list
  - Theme toggle as labeled button
  - Settings and logout links

---

## Footer Component

### Features

- Dynamic copyright year
- Links to: Privacy Policy, Terms of Service, Support
- Responsive: stacks vertically on mobile, horizontal on desktop
- Dark mode support

### Customization

Footer links point to `digistratum.com`. To customize:

```tsx
// In Footer.tsx
<a href="https://digistratum.com/privacy">Privacy</a>
<a href="https://digistratum.com/terms">Terms</a>
<a href="https://digistratum.com/support">Support</a>
```

---

## Layout Component

Combines DSNav and Footer with a flex column layout:

```tsx
<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  <DSNav />
  <main className="flex-1">
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  </main>
  <Footer />
</div>
```

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `min-h-screen` | Full viewport height minimum |
| `flex flex-col` | Vertical flex layout |
| `flex-1` | Main content grows to fill space |
| `max-w-7xl mx-auto` | Centered container with max width |

---

## Internationalization

All user-facing strings use `react-i18next`. Translation keys:

```json
{
  "nav": {
    "personal": "Personal",
    "appSwitcher": "Switch app",
    "dsApps": "DigiStratum Apps",
    "current": "Current",
    "menu": "Menu",
    "switchTenant": "Switch Organization"
  },
  "common": {
    "settings": "Settings",
    "logout": "Logout"
  },
  "theme": {
    "light": "Light",
    "dark": "Dark"
  },
  "footer": {
    "copyright": "© {{year}} DigiStratum LLC. All rights reserved."
  }
}
```

---

## Accessibility (NFR-A11Y)

- All buttons have `aria-label` attributes
- Keyboard navigation supported (Tab, Enter, Escape)
- Focus states visible on all interactive elements
- Semantic HTML structure (`<header>`, `<main>`, `<footer>`)
- Color contrast meets WCAG AA standards

---

## Testing

Navigation components should be tested for:

1. **Rendering:** Components render without errors
2. **User menu:** Shows user info, handles logout
3. **Tenant switcher:** Lists tenants, handles selection
4. **App switcher:** Displays DS apps, highlights current
5. **Mobile menu:** Opens/closes, contains all controls
6. **Theme toggle:** Switches theme, persists preference

Example test structure:

```tsx
// __tests__/nav.test.tsx
describe('DSNav', () => {
  it('renders app name', () => { /* ... */ });
  it('shows tenant switcher when user has tenants', () => { /* ... */ });
  it('opens app switcher on click', () => { /* ... */ });
  it('shows mobile menu on small screens', () => { /* ... */ });
});
```

---

## Extending

### Adding Navigation Links

For apps that need additional nav links (e.g., Dashboard, Projects):

```tsx
// Option 1: Add to DSNav props
interface DSNavProps {
  appName?: string;
  currentAppId?: string;
  navLinks?: Array<{ label: string; href: string }>;
}

// Option 2: Create app-specific nav wrapper
function MyAppNav() {
  return (
    <>
      <DSNav appName="My App" />
      <nav className="border-b ...">
        <a href="/dashboard">Dashboard</a>
        <a href="/projects">Projects</a>
      </nav>
    </>
  );
}
```

### Custom Logo

Replace the logo image source:

```tsx
<img 
  src="/my-app-logo.svg"  // Custom logo
  alt="My App" 
  className="h-8 w-8"
/>
```

---

*Last updated: 2026-02-19*
