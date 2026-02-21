# @digistratum/ds-core

DigiStratum shared runtime library - core utilities, hooks, and components for DS applications.

## Installation

```bash
npm install @digistratum/ds-core
```

## Overview

`@ds/core` provides shared runtime functionality used across all DigiStratum applications:

- **Hooks** - Reusable React hooks for common concerns
- **Components** - Core UI components (ErrorBoundary, FeatureFlag, etc.)
- **Utilities** - API client, storage helpers, constants
- **Types** - Shared TypeScript definitions

## Package Structure

```
@digistratum/ds-core/
├── index.ts           # Main entry - all exports
├── hooks/             # React hooks
│   ├── useConsent     # GDPR cookie consent state
│   ├── useFeatureFlags# Feature flag provider & hooks
│   ├── useTheme       # Light/dark mode theme
│   └── useTenantTheme # Tenant-specific branding
├── components/        # React components
│   ├── ErrorBoundary  # Error catching wrapper
│   ├── FeatureFlag    # Conditional rendering by flag
│   ├── AdSlot         # Ad zone placeholder
│   └── Loading        # Spinner & skeleton
├── utils/             # Utility functions
│   ├── api-client     # HTTP client with tenant support
│   ├── constants      # DS URLs, storage keys
│   └── storage        # Safe localStorage wrappers
└── types/             # TypeScript definitions
```

## Usage

### Basic Setup

```tsx
import {
  ThemeProvider,
  FeatureFlagsProvider,
  ErrorBoundary,
} from '@digistratum/ds-core';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FeatureFlagsProvider>
          <YourApp />
        </FeatureFlagsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

### Hooks

#### useTheme

```tsx
import { useTheme } from '@digistratum/ds-core';

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      Current: {resolvedTheme}
    </button>
  );
}
```

#### useConsent

```tsx
import { useConsent } from '@digistratum/ds-core';

function Analytics() {
  const { hasFullConsent } = useConsent();
  
  useEffect(() => {
    if (hasFullConsent) {
      // Initialize analytics
    }
  }, [hasFullConsent]);
  
  return null;
}
```

#### useFeatureFlags

```tsx
import { useFeatureFlags, useFeatureFlag } from '@digistratum/ds-core';

function Dashboard() {
  const { isEnabled, isLoading } = useFeatureFlags();
  // OR use the convenience hook:
  const showNewDashboard = useFeatureFlag('new-dashboard');
  
  if (showNewDashboard) {
    return <NewDashboard />;
  }
  return <OldDashboard />;
}
```

#### useTenantTheme

```tsx
import { useTenantTheme } from '@digistratum/ds-core';

function Header() {
  const { logoUrl, isLoading } = useTenantTheme();
  
  return (
    <header>
      <img src={logoUrl || '/default-logo.svg'} alt="Logo" />
    </header>
  );
}
```

### Components

#### ErrorBoundary

```tsx
import { ErrorBoundary } from '@digistratum/ds-core';

<ErrorBoundary
  fallback={<CustomErrorPage />}
  onError={(error, info) => logToService(error, info)}
  resetKey={pathname} // Reset on route change
>
  <App />
</ErrorBoundary>
```

#### FeatureFlag

```tsx
import { FeatureFlag } from '@digistratum/ds-core';

// Show when flag is enabled
<FeatureFlag flag="new-feature">
  <NewFeature />
</FeatureFlag>

// With fallback
<FeatureFlag flag="new-feature" fallback={<OldFeature />}>
  <NewFeature />
</FeatureFlag>

// Inverse (show when disabled)
<FeatureFlag flag="deprecated-feature" inverse>
  <DeprecatedBanner />
</FeatureFlag>
```

#### Loading

```tsx
import { Loading, Skeleton } from '@digistratum/ds-core';

// Spinner
<Loading size="lg" message="Loading data..." />

// Full screen loading
<Loading fullScreen message="Please wait..." />

// Skeleton placeholders
<Skeleton width="200px" height="20px" />
<Skeleton width="40px" height="40px" circle />
```

### Utilities

#### API Client

```tsx
import { ApiClient, createApiClient } from '@digistratum/ds-core';

const api = createApiClient({ baseURL: '/api' });

// Set tenant for multi-tenant requests
api.setTenant('tenant-123');

// Make requests
const data = await api.get<User>('/me');
await api.post('/items', { name: 'New Item' });
```

#### Constants

```tsx
import { DS_URLS, STORAGE_KEYS } from '@digistratum/ds-core';

// DigiStratum service URLs
console.log(DS_URLS.ACCOUNT); // https://account.digistratum.com
console.log(DS_URLS.PRIVACY); // https://www.digistratum.com/privacy

// Storage keys
console.log(STORAGE_KEYS.THEME); // ds-theme
console.log(STORAGE_KEYS.COOKIE_CONSENT); // ds-cookie-consent
```

## Build Outputs

The package builds to multiple formats:

- **ES Modules** (`dist/*.mjs`) - For modern bundlers and dynamic import
- **CommonJS** (`dist/*.js`) - For Node.js and legacy bundlers
- **UMD** (`dist/umd/ds-core.umd.js`) - For CDN distribution and script tags

### CDN Usage

```html
<!-- Load React first -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>

<!-- Then load ds-core -->
<script src="https://cdn.digistratum.com/ds-core/ds-core.umd.js"></script>

<script>
  // Available as window.DSCore
  const { useTheme, ErrorBoundary } = DSCore;
</script>
```

## Tree-shakeable Imports

Import only what you need:

```tsx
// Import everything
import { useTheme, ErrorBoundary, ApiClient } from '@digistratum/ds-core';

// Or import from subpaths
import { useTheme, ThemeProvider } from '@digistratum/ds-core/hooks';
import { ErrorBoundary, Loading } from '@digistratum/ds-core/components';
import { ApiClient, DS_URLS } from '@digistratum/ds-core/utils';
import type { User, Theme } from '@digistratum/ds-core/types';
```

## What's NOT in ds-core

- **GDPR Consent Banner UI** - See `@digistratum/ds-ui` or issue #358
- **Auth Provider** - See `@digistratum/ds-auth`
- **Full UI Components** - See `@digistratum/ds-ui`

This package focuses on runtime utilities and hooks. UI components specific to DS branding are in `@digistratum/ds-ui`.

## License

MIT
