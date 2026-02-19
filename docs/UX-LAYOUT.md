# UX Layout Patterns

> Standard layout patterns for DigiStratum applications.
> All DS apps should follow these patterns for ecosystem consistency.

---

## Layout Structure

All DS applications use a consistent three-zone layout:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (DSNav)                                               │
│ [App Switcher] [Logo] [App Name] ........ [Tenant] [User]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                     MAIN CONTENT                             │
│                                                              │
│              (max-width: 7xl, centered)                      │
│                                                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                       │
│ © 2026 DigiStratum LLC          Privacy | Terms | Support   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```tsx
<ThemeProvider>
  <AuthProvider>
    <Layout appName="Your App" currentAppId="yourappid">
      {/* Your page content */}
    </Layout>
  </AuthProvider>
</ThemeProvider>
```

### Layout Component (`components/Layout.tsx`)

The `Layout` component wraps all pages and provides:
- Full-height flex column (`min-h-screen flex flex-col`)
- DSNav header
- Main content area with responsive padding
- Footer that stays at bottom

```tsx
import { Layout } from './components';

function MyPage() {
  return (
    <Layout appName="DSKanban" currentAppId="dskanban">
      <h1>Dashboard</h1>
      {/* Page content */}
    </Layout>
  );
}
```

---

## Header Zone (DSNav)

### Structure

```
┌────────────────────────────────────────────────────────────┐
│ [⊞] [DS] App Name              [🏢 Org] [🌙] [Avatar ▾]   │
└────────────────────────────────────────────────────────────┘
  │    │    │                      │        │     │
  │    │    │                      │        │     └─ User menu (profile/settings/logout)
  │    │    │                      │        └─ Theme toggle
  │    │    │                      └─ Tenant switcher
  │    │    └─ Application name
  │    └─ Brand logo (brand-logo.svg)
  └─ App switcher (DS ecosystem apps)
```

### Features

1. **App Switcher** [FR-NAV-002]
   - Grid icon opens dropdown of DS ecosystem apps
   - Current app highlighted with "Current" badge

2. **Logo** [FR-NAV-001]
   - Located upper-left, after app switcher
   - Uses `brand-logo.svg` (falls back to `favicon.svg`)

3. **Tenant Switcher** [FR-TENANT-002]
   - Building icon with organization name
   - Dropdown lists user's tenants + "Personal" option

4. **User Menu**
   - Avatar with user initial
   - Dropdown with: name, email, Settings link, Logout

5. **Theme Toggle** [FR-THEME-001]
   - Sun/moon icon
   - Switches between light/dark themes

---

## Content Zone

The main content area is:
- **Flex-grow**: Takes remaining vertical space
- **Max-width**: Limited to `max-w-7xl` (80rem)
- **Centered**: `mx-auto`
- **Responsive padding**:
  - Mobile: `px-4 py-6`
  - Tablet: `sm:px-6`
  - Desktop: `lg:px-8`

```tsx
<main className="flex-1">
  <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
    {children}
  </div>
</main>
```

### Content Guidelines

- Use `card` class for card containers: `bg-white dark:bg-gray-800 rounded-lg shadow-sm`
- Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Use Tailwind's `sm:`, `md:`, `lg:` prefixes for responsive layouts

---

## Footer Zone

Standard footer with:
- Dynamic copyright year
- Links: Privacy, Terms, Support
- Responsive layout (stacks on mobile)

```tsx
<footer className="bg-white dark:bg-gray-800 border-t ...">
  <div className="max-w-7xl mx-auto px-4 py-4 ...">
    <p>© 2026 DigiStratum LLC. All rights reserved.</p>
    <div className="flex space-x-4">
      <a href="...">Privacy</a>
      <a href="...">Terms</a>
      <a href="...">Support</a>
    </div>
  </div>
</footer>
```

---

## Mobile Responsiveness [FR-NAV-004]

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Default | < 640px | Mobile (hamburger menu) |
| `sm:` | ≥ 640px | Desktop (full nav) |
| `md:` | ≥ 768px | Wider content |
| `lg:` | ≥ 1024px | Full desktop |

### Mobile Header

On screens < 640px:
- App switcher remains visible
- Logo and app name hidden
- Hamburger menu replaces right-side controls
- Menu expands to full-width panel with:
  - User info
  - Tenant switcher as buttons
  - Theme toggle with label
  - Settings and Logout

### Testing Mobile

```bash
# Run dev server
npm run dev

# Open Chrome DevTools
# Toggle device toolbar (Ctrl+Shift+M)
# Test at 320px, 375px, 414px widths
```

---

## Theme System [FR-THEME-001, FR-THEME-003]

### Light Theme (Default)

```css
:root {
  --ds-bg-primary: #ffffff;
  --ds-bg-secondary: #f9fafb;
  --ds-text-primary: #111827;
  --ds-text-secondary: #6b7280;
  --ds-border: #e5e7eb;
}
```

### Dark Theme

```css
.dark {
  --ds-bg-primary: #1f2937;
  --ds-bg-secondary: #111827;
  --ds-text-primary: #f9fafb;
  --ds-text-secondary: #9ca3af;
  --ds-border: #374151;
}
```

### Theme Implementation

1. **CSS Variables** in `src/styles/globals.css`
2. **ThemeProvider** hook in `src/hooks/useTheme.tsx`
3. **Persistence** via `localStorage.theme`
4. **System preference** supported via `(prefers-color-scheme: dark)`

### Adding Custom Themes (Future)

```css
/* Add new theme class */
.theme-brand {
  --ds-primary: #your-brand-color;
  --ds-bg-primary: #your-bg;
  /* Override other variables */
}
```

```tsx
// Update ThemeProvider to support custom themes
const setTheme = (newTheme: Theme) => {
  // Remove all theme classes
  root.classList.remove('light', 'dark', 'theme-brand');
  root.classList.add(newTheme);
};
```

---

## Accessibility

### Semantic Structure

```html
<div class="min-h-screen flex flex-col">
  <header><!-- DSNav --></header>
  <main><!-- Content --></main>
  <footer><!-- Footer --></footer>
</div>
```

### Keyboard Navigation

- All interactive elements focusable via Tab
- Dropdowns close on Escape
- Focus rings visible on all controls

### Screen Readers

- `aria-label` on icon buttons
- Proper heading hierarchy in content
- Meaningful link text

---

## Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| Layout | `components/Layout.tsx` | Page wrapper |
| DSNav | `components/DSNav.tsx` | Header with all nav features |
| Footer | `components/Footer.tsx` | Standard footer |
| ThemeProvider | `hooks/useTheme.tsx` | Theme state management |
| AuthProvider | `hooks/useAuth.tsx` | Auth and tenant state |

| Asset | Location | Purpose |
|-------|----------|---------|
| brand-logo.svg | `public/brand-logo.svg` | Header logo |
| favicon.svg | `public/favicon.svg` | Browser icon |
| globals.css | `src/styles/globals.css` | CSS variables & base styles |

---

*Last updated: 2026-02-19*
