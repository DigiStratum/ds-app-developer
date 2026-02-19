# Feature Flags

Feature flags enable **deploy/release separation** — code can be deployed without immediately being available to users. This is foundational infrastructure for safe deployments and gradual rollouts.

## Quick Start

### Backend: Check if a Flag is Enabled

```go
import "github.com/DigiStratum/ds-app-skeleton/backend/internal/featureflags"

func MyHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    if featureflags.IsEnabled(ctx, "new-dashboard") {
        // New code path
        renderNewDashboard(w, r)
    } else {
        // Old code path
        renderOldDashboard(w, r)
    }
}
```

### Frontend: Check if a Flag is Enabled

```tsx
import { useFeatureFlags, FeatureFlag } from '../hooks/useFeatureFlags';

// Using hook
function MyComponent() {
  const { isEnabled } = useFeatureFlags();
  
  if (isEnabled('new-dashboard')) {
    return <NewDashboard />;
  }
  return <OldDashboard />;
}

// Using component
function MyPage() {
  return (
    <FeatureFlag flag="new-feature">
      <NewFeatureComponent />
    </FeatureFlag>
  );
}
```

## Evaluation Priority

Flags are evaluated in this order (first match wins):

1. **User-specific disable** — If user ID is in `disabled_users`, flag is OFF
2. **User-specific enable** — If user ID is in `users`, flag is ON
3. **Tenant-specific disable** — If tenant ID is in `disabled_tenants`, flag is OFF
4. **Tenant-specific enable** — If tenant ID is in `tenants`, flag is ON
5. **Percentage rollout** — Hash-based deterministic rollout
6. **Global default** — The `enabled` field value

### Percentage Rollout

For percentage rollouts, the system computes `hash(flag_key + user_id) % 100`. If the result is less than the percentage, the flag is enabled. This ensures:

- **Deterministic**: Same user always gets the same result
- **Flag-specific**: A user might be in the 10% for one flag but not another
- **Guest support**: Falls back to session ID if no user ID

## Adding a New Flag

### 1. Create the Flag in DynamoDB

Via API (admin only):
```bash
curl -X PUT https://your-app.com/api/flags/new-feature \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "description": "Enables the new feature",
    "percentage": 0
  }'
```

Or directly in DynamoDB:
```
PK: FF#new-feature
SK: FLAG
{
  "Key": "new-feature",
  "Enabled": false,
  "Description": "Enables the new feature",
  "Tenants": [],
  "Users": [],
  "Percentage": 0,
  "CreatedAt": "2024-01-01T00:00:00Z",
  "UpdatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. Use the Flag in Code

Backend:
```go
if featureflags.IsEnabled(ctx, "new-feature") {
    // New behavior
}
```

Frontend:
```tsx
<FeatureFlag flag="new-feature">
  <NewComponent />
</FeatureFlag>
```

### 3. Roll Out

Gradual rollout example:
1. Start with 5% of users
2. Monitor metrics
3. Increase to 25%, 50%, 100%
4. Remove flag code once stable

## API Reference

### GET /api/flags/evaluate

Evaluates all flags for the current user context. Used by the frontend on page load.

**Response:**
```json
{
  "flags": {
    "new-dashboard": true,
    "beta-feature": false,
    "dark-mode": true
  }
}
```

### GET /api/flags (Admin Only)

Lists all feature flags with full configuration.

**Response:**
```json
[
  {
    "key": "new-dashboard",
    "enabled": false,
    "description": "New dashboard UI",
    "tenants": ["tenant-beta"],
    "users": ["user-123"],
    "percentage": 10,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
]
```

### PUT /api/flags/:key (Admin Only)

Creates or updates a feature flag.

**Request:**
```json
{
  "enabled": false,
  "description": "New dashboard UI",
  "tenants": ["tenant-beta"],
  "users": ["user-123"],
  "disabled_tenants": [],
  "disabled_users": [],
  "percentage": 10
}
```

### DELETE /api/flags/:key (Admin Only)

Deletes a feature flag.

## Frontend Usage Patterns

### Provider Setup

Add the provider to your app root (App.tsx):

```tsx
import { FeatureFlagsProvider } from './hooks/useFeatureFlags';

function App() {
  return (
    <AuthProvider>
      <FeatureFlagsProvider>
        <Router>
          {/* ... */}
        </Router>
      </FeatureFlagsProvider>
    </AuthProvider>
  );
}
```

### Conditional Rendering

```tsx
import { FeatureFlag } from './components/FeatureFlag';

// Simple toggle
<FeatureFlag flag="new-header">
  <NewHeader />
</FeatureFlag>

// With fallback
<FeatureFlag flag="new-sidebar" fallback={<OldSidebar />}>
  <NewSidebar />
</FeatureFlag>

// Inverse (show when disabled)
<FeatureFlag flag="deprecated-warning" inverse>
  <DeprecationNotice />
</FeatureFlag>
```

### Hook Usage

```tsx
import { useFeatureFlags, useFeatureFlag } from './hooks/useFeatureFlags';

// Multiple flags
function Dashboard() {
  const { isEnabled, isLoading } = useFeatureFlags();
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {isEnabled('analytics-v2') && <AnalyticsV2 />}
      {isEnabled('export-csv') && <ExportButton />}
    </div>
  );
}

// Single flag
function FeatureButton() {
  const enabled = useFeatureFlag('new-button-style');
  return <button className={enabled ? 'new' : 'old'}>Click</button>;
}
```

## Deploy/Release Workflow

### Safe Deployment Pattern

1. **Deploy with flag OFF** — Code is in production but not active
2. **Enable for internal users** — Add team user IDs to `users` list
3. **Enable for beta tenant** — Add beta tenant to `tenants` list
4. **Percentage rollout** — Gradually increase from 5% → 25% → 50% → 100%
5. **Remove flag** — Once stable, remove the flag check and clean up

### Example Timeline

| Day | Action | Flag Config |
|-----|--------|-------------|
| 0 | Deploy code | `enabled: false` |
| 1 | Internal testing | `users: ["team-member-1", "team-member-2"]` |
| 3 | Beta rollout | `tenants: ["beta-tenant"]` |
| 5 | 5% rollout | `percentage: 5` |
| 7 | 25% rollout | `percentage: 25` |
| 10 | Full rollout | `enabled: true` |
| 14 | Remove flag | Delete flag, remove code |

## DynamoDB Schema

Feature flags use the single-table design:

| Attribute | Value | Description |
|-----------|-------|-------------|
| PK | `FF#<key>` | Partition key |
| SK | `FLAG` | Sort key |
| Key | `string` | Flag identifier |
| Enabled | `bool` | Global default |
| Description | `string` | What this flag controls |
| Tenants | `[]string` | Enabled tenant IDs |
| Users | `[]string` | Enabled user IDs |
| DisabledTenants | `[]string` | Disabled tenant IDs |
| DisabledUsers | `[]string` | Disabled user IDs |
| Percentage | `int` | Rollout percentage (0-100) |
| CreatedAt | `timestamp` | Creation time |
| UpdatedAt | `timestamp` | Last update time |

## Caching

### Backend

- In-memory cache with 30-second TTL
- Cache is invalidated on write operations
- Call `store.InvalidateCache()` if needed

### Frontend

- sessionStorage cache with 5-minute TTL
- Survives page refreshes within session
- Automatically refreshed on provider mount

## Best Practices

1. **Use descriptive flag names**: `new-checkout-flow` not `flag1`
2. **Document flags**: Always include a description
3. **Clean up old flags**: Remove flag code once fully rolled out
4. **Default to OFF**: New flags should be disabled by default
5. **Monitor rollouts**: Watch metrics when increasing percentage
6. **Test both paths**: Ensure fallback code still works
7. **Don't nest flags**: Avoid `if flag1 && flag2` complexity

## Troubleshooting

### Flag not evaluating correctly

1. Check evaluation context (user ID, tenant ID, session ID)
2. Verify flag exists in DynamoDB
3. Check evaluation priority order
4. Look at `reason` field in evaluation result (debug mode)

### Frontend not updating

1. Clear sessionStorage cache
2. Call `refresh()` from `useFeatureFlags()`
3. Check network tab for /api/flags/evaluate response

### Cache issues

Backend:
```go
featureflags.GetStore().InvalidateCache()
```

Frontend:
```ts
sessionStorage.removeItem('ds-feature-flags');
```
