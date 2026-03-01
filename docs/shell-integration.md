# Shell Integration Guide

This guide explains how to integrate the DigiStratum App Shell into your derived application.

## Overview

The App Shell provides consistent header, footer, and layout components that are loaded at runtime from a CDN. This allows shell updates to propagate to all derived apps without requiring rebuilds.

**CDN URL**: `https://apps.digistratum.com/shell/{version}/shell.js`

## Quick Start

### 1. Load Shell from CDN

```typescript
// src/Shell.tsx
import { lazy, Suspense } from 'react';

// Dynamic import from CDN
const ShellModule = import(
  /* @vite-ignore */
  'https://apps.digistratum.com/shell/v1/shell.js'
);

// Lazy-load components
export const DSAppShell = lazy(() => ShellModule.then(m => ({ default: m.DSAppShell })));
export const DSHeader = lazy(() => ShellModule.then(m => ({ default: m.DSHeader })));
export const DSFooter = lazy(() => ShellModule.then(m => ({ default: m.DSFooter })));

// Shell wrapper with loading state
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <DSAppShell
        appName="MyApp"
        // ... props
      >
        {children}
      </DSAppShell>
    </Suspense>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-16 bg-gray-200 animate-pulse" />
      <div className="flex-1 bg-gray-100" />
      <div className="h-16 bg-gray-200 animate-pulse" />
    </div>
  );
}
```

### 2. Use in Your App

```typescript
// src/App.tsx
import { AppShell } from './Shell';
import { MyRoutes } from './routes';

export function App() {
  return (
    <AppShell>
      <MyRoutes />
    </AppShell>
  );
}
```

## Version Strategy

| URL Pattern | Cache Duration | Use Case |
|-------------|----------------|----------|
| `/shell/v1/shell.js` | 1 year (immutable) | Production - pin to specific version |
| `/shell/latest/shell.js` | 5 minutes | Development/staging - always get latest |

### Recommended: Pin to Version

```typescript
// Production: Pin to specific version
const ShellModule = import('https://apps.digistratum.com/shell/v1/shell.js');
```

### Development: Use Latest

```typescript
// Development only - get latest shell
const SHELL_URL = import.meta.env.DEV
  ? 'https://apps.digistratum.com/shell/latest/shell.js'
  : 'https://apps.digistratum.com/shell/v1/shell.js';

const ShellModule = import(/* @vite-ignore */ SHELL_URL);
```

## Local Development

For local shell development, alias the CDN import to your local shell package:

### Option 1: Vite Alias

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: import.meta.env.DEV ? {
      'https://apps.digistratum.com/shell/v1/shell.js': 
        path.resolve(__dirname, '../ds-app-developer/packages/layout/src/index.ts')
    } : {}
  }
});
```

### Option 2: Import Map (Browser)

```html
<!-- index.html (development only) -->
<script type="importmap">
{
  "imports": {
    "https://apps.digistratum.com/shell/v1/shell.js": "/shell/dev/shell.js"
  }
}
</script>
```

### Option 3: Conditional Import

```typescript
// src/Shell.tsx
const isDev = import.meta.env.DEV;

const ShellModule = isDev
  ? import('../path/to/local/shell')
  : import(/* @vite-ignore */ 'https://apps.digistratum.com/shell/v1/shell.js');
```

## Shell Components

### DSAppShell

Main layout wrapper with all shell features.

```typescript
import type { DSAppShellProps } from '@digistratum/layout';

<DSAppShell
  appName="MyApp"
  currentAppId="myapp"
  auth={authContext}
  theme={themeContext}
  navLinks={[
    { label: 'Dashboard', path: '/' },
    { label: 'Settings', path: '/settings' },
  ]}
  apps={[
    { id: 'dskanban', name: 'DSKanban', url: 'https://projects.digistratum.com' },
  ]}
  showAppSwitcher={true}
  showTenantSwitcher={true}
>
  {children}
</DSAppShell>
```

### DSHeader (Standalone)

Use if you need just the header without the full shell.

```typescript
<DSHeader
  appName="MyApp"
  auth={authContext}
  theme={themeContext}
  navLinks={navLinks}
/>
```

### DSFooter (Standalone)

Use if you need just the footer.

```typescript
<DSFooter
  appName="MyApp"
  copyrightHolder="DigiStratum LLC"
  links={footerLinks}
  showGdprBanner={true}
/>
```

## Preloading

Add preload hints to reduce shell load time:

```html
<!-- index.html -->
<head>
  <!-- Preload shell module -->
  <link rel="modulepreload" href="https://apps.digistratum.com/shell/v1/shell.js">
</head>
```

## Error Handling

Handle shell loading failures gracefully:

```typescript
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const DSAppShell = lazy(() => 
  import(/* @vite-ignore */ 'https://apps.digistratum.com/shell/v1/shell.js')
    .then(m => ({ default: m.DSAppShell }))
    .catch(err => {
      console.error('Failed to load shell:', err);
      // Return fallback component
      return { default: FallbackShell };
    })
);

function FallbackShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="h-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <span className="text-xl font-bold">DigiStratum</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

## TypeScript Support

For TypeScript type checking, install the layout package as a dev dependency:

```bash
npm install --save-dev @digistratum/layout
```

Then use types without importing the actual module:

```typescript
import type { DSAppShellProps, AuthContext, ThemeContext } from '@digistratum/layout';
```

## Related Resources

- [App Shell Architecture (Epic #911)](https://kanban.digistratum.com/issues/911)
- [Remote ESM Spike (#912)](https://kanban.digistratum.com/issues/912)
- [@digistratum/layout Package](../packages/layout/)
