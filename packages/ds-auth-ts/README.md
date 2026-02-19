# ds-auth-ts

DigiStratum shared authentication package for React applications. Provides SSO integration with DSAccount and multi-tenant support.

## Installation

```bash
npm install @digistratum/ds-auth
# or
yarn add @digistratum/ds-auth
```

## Quick Start

```tsx
import { AuthProvider, useAuth, RequireAuth } from '@digistratum/ds-auth';

// Wrap your app
function App() {
  return (
    <AuthProvider config={{ appId: 'your-app-id' }}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Use in components
function UserMenu() {
  const { user, isLoading, logout, switchTenant, currentTenant } = useAuth();

  if (isLoading) return <Spinner />;
  if (!user) return <LoginButton />;

  return (
    <div>
      <span>{user.name}</span>
      <TenantPicker
        tenants={user.tenants}
        selected={currentTenant}
        onChange={switchTenant}
      />
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Features

### AuthProvider

The root provider that manages authentication state:

```tsx
<AuthProvider
  config={{
    // Required
    appId: 'your-app-id',

    // Optional
    ssoBaseURL: 'https://account.digistratum.com', // Default
    appURL: window.location.origin, // Default
    apiBaseURL: '', // API base URL
    tenantStorageKey: 'ds_currentTenant', // localStorage key
    sessionEndpoint: '/api/me', // Where to check session
  }}
>
  {children}
</AuthProvider>
```

### Hooks

#### `useAuth()`
Main auth hook with full context:

```tsx
const {
  user,           // User | null
  currentTenant,  // string | null
  isLoading,      // boolean
  isAuthenticated,// boolean
  login,          // (redirectTo?: string) => void
  logout,         // () => void
  switchTenant,   // (tenantId: string | null) => void
  refresh,        // () => Promise<void>
} = useAuth();
```

#### `useUser()`
Get authenticated user (throws if not authenticated):

```tsx
// Use in protected routes only
const user = useUser();
console.log(user.email);
```

#### `useTenant()`
Get current tenant ID:

```tsx
const tenantId = useTenant(); // string | null
```

#### `useRequiredTenant()`
Get tenant ID (throws if none selected):

```tsx
// Use where tenant is required
const tenantId = useRequiredTenant();
```

### Components

#### `<RequireAuth>`
Protect routes that need authentication:

```tsx
<RequireAuth
  loadingFallback={<Spinner />}
  unauthenticatedFallback={<LoginPrompt />}
  autoRedirect={true} // Redirect to SSO login automatically
>
  <ProtectedContent />
</RequireAuth>
```

#### `<RequireTenant>`
Require tenant selection:

```tsx
<RequireTenant
  noTenantFallback={<TenantPicker />}
  onNoTenant={() => showTenantModal()}
>
  <TenantScopedContent />
</RequireTenant>
```

### API Client

Pre-configured HTTP client with tenant header support:

```tsx
import { AuthApiClient, createApiClient } from '@digistratum/ds-auth';

// Create a client
const api = createApiClient({ baseURL: '/api' });

// Set tenant (usually done by AuthProvider)
api.setTenant('tenant-123');

// Make requests (automatically includes X-Tenant-ID)
const data = await api.get<MyData>('/resources');
await api.post('/resources', { name: 'New Resource' });
```

Error handling:

```tsx
import { AuthApiError } from '@digistratum/ds-auth';

try {
  await api.get('/protected');
} catch (err) {
  if (err instanceof AuthApiError) {
    if (err.isAuthError()) {
      // 401 - redirect to login
    } else if (err.isTenantError()) {
      // Tenant required or forbidden
    }
  }
}
```

### Utilities

```tsx
import {
  buildLoginURL,
  buildLogoutURL,
  userHasTenant,
  parseCallbackParams,
  getRedirectFromState,
  storage,
} from '@digistratum/ds-auth';

// Build SSO URLs
const loginUrl = buildLoginURL(config, '/dashboard');
const logoutUrl = buildLogoutURL(config);

// Check tenant access
if (userHasTenant(user, 'tenant-123')) {
  // User has access
}

// Parse callback (for custom callback handling)
const { code, state, error } = parseCallbackParams();
const redirectTo = getRedirectFromState(state);

// SSR-safe localStorage
storage.set('key', 'value');
const value = storage.get('key');
storage.remove('key');
```

## Types

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  tenants: string[];
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
}

interface AuthConfig {
  appId: string;
  ssoBaseURL?: string;
  appURL?: string;
  apiBaseURL?: string;
  tenantStorageKey?: string;
  sessionEndpoint?: string;
}
```

## Server-Side Rendering

All utilities are SSR-safe. Window/localStorage access is guarded:

```tsx
// Works on server and client
const { user, isLoading } = useAuth();
const tenantId = storage.get('tenant'); // Returns null on server
```

## Testing

```tsx
import { AuthProvider } from '@digistratum/ds-auth';
import { render } from '@testing-library/react';

// Mock auth state in tests
function renderWithAuth(ui: ReactElement, { user = null } = {}) {
  return render(
    <AuthProvider config={{ appId: 'test' }}>
      {ui}
    </AuthProvider>
  );
}
```

## License

MIT
