# @digistratum/ds-core - Agent Guidelines

> Core utilities, hooks, and primitives for DigiStratum applications.
> Use these before creating app-specific versions.

## Component Inventory

### Providers

| Component | Use For |
|-----------|---------|
| `ThemeProvider` | Wrap app root - provides theme context |

### UI Components

| Component | Use For |
|-----------|---------|
| `ErrorBoundary` | Catch and display React errors gracefully |
| `Loading` | Standard loading spinner |
| `FeatureFlag` | Conditionally render based on feature flags |
| `ShellFallback` | Loading state while shell loads |

### Hooks

| Hook | Use For |
|------|---------|
| `useTheme()` | Get/set theme (light/dark/system) |
| `useFeatureFlags()` | Check feature flag state |
| `useConsent()` | GDPR consent state |
| `useDiscovery()` | Service discovery for DS ecosystem |
| `useShellLoader()` | Lazy-load shell components |
| `useTenantTheme()` | Tenant-specific theming |

### Utilities

| Utility | Use For |
|---------|---------|
| `apiClient` | Configured fetch wrapper with auth |
| `storage` | Safe localStorage/sessionStorage wrapper |
| `discovery` | Service URL resolution |
| `constants` | Shared constants (URLs, keys) |

---

## Before Creating New Utilities

1. **Check this package first** - Does a utility already exist?
2. **Check `@digistratum/layout`** - For layout/UI components
3. **If creating something reusable** - Add it here, not in the app

---

## Adding New Components/Utilities

When adding to this package:

1. **Export from appropriate barrel** - `src/index.ts`, `src/hooks/index.ts`, etc.
2. **Update this AGENTS.md** - Add to the inventory tables above
3. **Bump version** in `package.json` (semver)
4. **Publish** - CI handles this on push to main

### Checklist

- [ ] TypeScript with exported types
- [ ] No side effects on import
- [ ] Has JSDoc comments
- [ ] Added to inventory table in this file

---

## Package Structure

```
src/
├── index.ts           # Main exports
├── components/        # React components
│   └── index.ts
├── hooks/             # React hooks
│   └── index.ts
├── utils/             # Non-React utilities
│   └── index.ts
└── types/             # TypeScript types
    └── index.ts
```

---

## Publishing

Packages are published to GitHub Packages on push to main.
Apps using `@digistratum/ds-core@^0.x.x` will get updates automatically.
