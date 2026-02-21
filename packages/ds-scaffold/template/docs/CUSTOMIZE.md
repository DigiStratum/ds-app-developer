# Customizing Your App

This guide explains how to customize your scaffolded DigiStratum app.

## Adding New Pages

1. Create a new page component in `src/pages/`:

```tsx
// src/pages/Dashboard.tsx
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';

export function DashboardPage() {
  const { t } = useTranslation();
  
  return (
    <Layout appName="Your App">
      <h1>{t('dashboard.title', 'Dashboard')}</h1>
      {/* Your content here */}
    </Layout>
  );
}
```

2. Add the route in `src/App.tsx`:

```tsx
import { DashboardPage } from './pages/Dashboard';

// In AppRoutes:
<Route path="/dashboard" element={<DashboardPage />} />

// For protected routes:
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

3. Add navigation link in `src/components/Header.tsx`:

```tsx
<Link to="/dashboard">Dashboard</Link>
```

## Creating Components

Components should be placed in `src/components/`. Follow this pattern:

```tsx
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string;
  children: React.ReactNode;
}

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
```

Export from `src/components/index.ts`:

```tsx
export { MyComponent } from './MyComponent';
```

## Modifying the Theme

### CSS Variables

Edit `src/styles/globals.css` to change design tokens:

```css
:root {
  --ds-primary: #your-color;
  --ds-primary-hover: #your-hover-color;
  --ds-accent: #your-accent;
}
```

### Tailwind Config

Extend the theme in `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#your-color',
        secondary: '#your-secondary',
      },
    },
  },
},
```

## Adding API Routes

### Frontend API Calls

Use the api client in `src/api/client.ts`:

```tsx
import { api } from '../api/client';

// GET request
const data = await api.get<MyType>('/api/my-endpoint');

// POST request
const result = await api.post<MyType>('/api/my-endpoint', { key: 'value' });
```

The client automatically:
- Includes credentials (cookies)
- Adds the X-Tenant-ID header when set
- Handles errors

### Backend Integration

For backend routes, create a Go handler in your `backend/` directory:

```go
// backend/handlers/my_handler.go
func HandleMyEndpoint(w http.ResponseWriter, r *http.Request) {
    tenantID := r.Header.Get("X-Tenant-ID")
    // Your logic here
}
```

## Internationalization

### Adding Translations

Edit `src/i18n/config.ts`:

```tsx
resources: {
  en: {
    translation: {
      myFeature: {
        title: 'My Feature',
        description: 'This is my feature',
      },
    },
  },
  de: {
    translation: {
      myFeature: {
        title: 'Meine Funktion',
        description: 'Das ist meine Funktion',
      },
    },
  },
},
```

### Using Translations

```tsx
const { t } = useTranslation();

return (
  <div>
    <h1>{t('myFeature.title')}</h1>
    <p>{t('myFeature.description')}</p>
  </div>
);
```

## Environment Variables

Create `.env.local` for local development:

```env
VITE_API_URL=http://localhost:8080
VITE_DSACCOUNT_URL=https://account.digistratum.com
```

Access in code:

```tsx
const apiUrl = import.meta.env.VITE_API_URL;
```

## Inheritance from @ds/core

Your app inherits utilities from `@digistratum/ds-core`:

### Hooks

```tsx
import { useTheme, useConsent, useFeatureFlags } from '@digistratum/ds-core';
```

### Components

```tsx
import { ErrorBoundary, Loading, ThemeProvider } from '@digistratum/ds-core';
```

### Utils

```tsx
import { storage, constants } from '@digistratum/ds-core/utils';
```

See the ds-core package documentation for full API reference.
