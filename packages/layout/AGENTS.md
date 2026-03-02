# @digistratum/layout - Agent Guidelines

> Shared layout and UI components for DigiStratum applications.
> All DS apps should use these components for visual/behavioral consistency.

## Component Inventory

### Shell Wrappers (Use ONE per app)

| Component | Use For | Notes |
|-----------|---------|-------|
| `AppShell` | **Primary** - Standard app wrapper | Use via app-specific wrapper (e.g., `DeveloperAppShell`) |

### Header & Footer

| Component | Use For |
|-----------|---------|
| `DSHeader` | Standard header - logo, hamburger menu, user controls |
| `DSFooter` | Standard footer - links, copyright, GDPR |
| `CustomHeaderZone` | App-specific content above header (announcements, branding) |

### Navigation

| Component | Use For |
|-----------|---------|
| `NavigationMenu` | Hamburger menu content (rendered by DSHeader) |
| `UserSession` | User avatar/name display |
| `UserSessionMenu` | User dropdown (logout, settings, tenant switch) |

### Content Layout

| Component | Use For |
|-----------|---------|
| `ContentContainer` | Page wrapper with loading states, error handling, breadcrumbs |

### GDPR/Consent

| Component | Use For |
|-----------|---------|
| `GdprBanner` | Cookie consent banner |
| `CookiePreferencesModal` | Detailed cookie preferences |
| `useConsent()` | Hook for consent state |

### Advertising

| Component | Use For |
|-----------|---------|
| `AdSlot` | Placeholder for ads (header/footer positions) |

---

## Before Creating New Components

1. **Check this package first** - Does a component already exist?
2. **Check `@digistratum/ds-core`** - For utilities, hooks, and primitives
3. **If creating something reusable** - Add it here, not in the app

---

## Adding New Components

When adding a new reusable component to this package:

1. **Export from `src/index.ts`** - Both component and types
2. **Update this AGENTS.md** - Add to the inventory table above
3. **Bump version** in `package.json` (semver: patch for fixes, minor for features)
4. **Publish** - CI handles this on push to main

### Component Checklist

- [ ] TypeScript with exported prop types
- [ ] Respects `theme` context (light/dark mode)
- [ ] Uses Tailwind classes consistent with DS design
- [ ] Has JSDoc comments with `@example`
- [ ] Added to inventory table in this file

---

## Types Reference

```typescript
// Auth context (pass to AppShell)
interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  currentTenant: string | null;
  login: () => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}

// Theme context (pass to AppShell)  
interface ThemeContext {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

// Menu item (returned from getMenuItems callback)
interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  active?: boolean;
}
```

---

## Integration Pattern

Consumer apps wrap `AppShell` with app-specific defaults:

```tsx
// In your app: components/MyAppShell.tsx
import { AppShell } from '@digistratum/layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@digistratum/ds-core';

export function MyAppShell({ children }) {
  const auth = useAuth();
  const theme = useTheme();
  
  const getMenuItems = (user, tenant) => [
    { id: 'home', label: 'Home', path: '/', icon: '🏠' },
    // ... app-specific menu items
  ];
  
  return (
    <AppShell
      appName="My App"
      currentAppId="myapp"
      auth={auth}
      theme={theme}
      getMenuItems={getMenuItems}
    >
      {children}
    </AppShell>
  );
}
```

---

## Publishing

Packages are published to GitHub Packages on push to main.
Apps using `@digistratum/layout@^0.x.x` will get updates automatically.
