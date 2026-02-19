# Frontend Architecture

> React + TypeScript frontend architecture for DigiStratum applications.
> Based on Vite, Tailwind CSS v3, and modern React patterns.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.x | UI framework |
| TypeScript | 5.3.x | Type safety |
| Vite | 5.0.x | Build tool & dev server |
| Tailwind CSS | 3.4.x | Utility-first styling |
| React Router | 6.20.x | Client-side routing |
| react-i18next | 13.5.x | Internationalization |
| Vitest | 1.0.x | Unit testing |
| Testing Library | 14.1.x | React testing utilities |

---

## Project Structure

```
frontend/
├── index.html              # HTML entry point
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
├── public/
│   ├── favicon.svg         # Browser icon
│   ├── brand-logo.svg      # Header logo
│   └── locales/            # i18n translation files
│       ├── en/
│       │   └── translation.json
│       └── es/
│           └── translation.json
└── src/
    ├── main.tsx            # Application entry point
    ├── App.tsx             # Root component with routing
    ├── types.ts            # Shared TypeScript types
    ├── vite-env.d.ts       # Vite environment types
    ├── api/
    │   └── client.ts       # HTTP client with tenant header
    ├── components/
    │   ├── index.ts        # Barrel export
    │   ├── Layout.tsx      # Page layout wrapper
    │   ├── DSNav.tsx       # Navigation header
    │   └── Footer.tsx      # Standard footer
    ├── hooks/
    │   ├── useAuth.tsx     # Authentication context & hook
    │   └── useTheme.tsx    # Theme context & hook
    ├── pages/
    │   ├── Home.tsx        # Public landing page
    │   └── Dashboard.tsx   # Protected dashboard
    ├── i18n/
    │   └── config.ts       # i18next configuration
    ├── styles/
    │   └── globals.css     # Tailwind directives & CSS variables
    └── __tests__/
        └── auth.test.tsx   # Authentication tests
```

---

## React + TypeScript Patterns

### Component Structure

Components use functional components with TypeScript interfaces:

```tsx
import { ReactNode } from 'react';

interface ComponentProps {
  children: ReactNode;
  title?: string;  // Optional props have ?
}

export function MyComponent({ children, title = 'Default' }: ComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DSNav.tsx`, `Layout.tsx` |
| Hooks | camelCase, `use` prefix | `useAuth.tsx`, `useTheme.tsx` |
| Utilities | camelCase | `client.ts`, `config.ts` |
| Types/Interfaces | PascalCase | `User`, `AuthContext` |
| CSS classes | kebab-case (via Tailwind) | `btn-primary`, `ds-primary` |

### Type Definitions (`types.ts`)

Centralized type definitions:

```typescript
// User model matching backend
export interface User {
  id: string;
  email: string;
  name: string;
  tenants: string[];
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
}

// Context shapes
export interface AuthContext {
  user: User | null;
  currentTenant: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// API error shape
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id?: string;
  };
}
```

### JSX Best Practices

```tsx
// ✅ Destructure props at function signature
function Card({ title, children }: CardProps) { }

// ✅ Use className for all styling
<div className="bg-white p-4 rounded-lg">

// ✅ Conditional classes with template literals
<button className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}>

// ✅ Use fragments to avoid extra DOM nodes
return (
  <>
    <Header />
    <Content />
  </>
);

// ✅ Key prop for lists
{items.map((item) => (
  <Item key={item.id} data={item} />
))}
```

---

## State Management

### Context API Pattern

The app uses React Context for global state. **No Redux or external state libraries**.

#### Provider Hierarchy

```tsx
// main.tsx - Entry point
<React.StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</React.StrictMode>

// App.tsx - Provider nesting
<ThemeProvider>        {/* Outermost - no dependencies */}
  <AuthProvider>       {/* Depends on theme potentially */}
    <AppRoutes />
  </AuthProvider>
</ThemeProvider>
```

#### Creating a Context

Pattern used throughout the app:

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Define context shape
interface MyContext {
  value: string;
  setValue: (v: string) => void;
}

// 2. Create context with null default
const MyContextInstance = createContext<MyContext | null>(null);

// 3. Provider component
export function MyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('default');

  return (
    <MyContextInstance.Provider value={{ value, setValue }}>
      {children}
    </MyContextInstance.Provider>
  );
}

// 4. Custom hook with error handling
export function useMyContext(): MyContext {
  const context = useContext(MyContextInstance);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

### Auth Context (`hooks/useAuth.tsx`)

Manages authentication state and tenant context:

```tsx
const { user, currentTenant, isLoading, login, logout, switchTenant } = useAuth();
```

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user or null |
| `currentTenant` | `string \| null` | Active tenant ID |
| `isLoading` | `boolean` | Auth check in progress |
| `login()` | `function` | Redirect to SSO |
| `logout()` | `function` | Clear session, redirect |
| `switchTenant(id)` | `function` | Change tenant context |

Key features:
- Checks session on mount via `/api/me`
- Persists tenant choice in localStorage
- Syncs tenant ID to API client for headers

### Theme Context (`hooks/useTheme.tsx`)

Manages light/dark theme:

```tsx
const { theme, setTheme, resolvedTheme } = useTheme();
```

| Property | Type | Description |
|----------|------|-------------|
| `theme` | `'light' \| 'dark' \| 'system'` | User preference |
| `setTheme(t)` | `function` | Update preference |
| `resolvedTheme` | `'light' \| 'dark'` | Actual applied theme |

Key features:
- Persists to localStorage
- Respects `prefers-color-scheme` for system mode
- Applies class to `<html>` element for CSS

### Local State vs Context

| Use Case | Solution |
|----------|----------|
| User authentication | `useAuth` context |
| Theme preference | `useTheme` context |
| Current tenant | `useAuth` context |
| Form inputs | `useState` |
| Component visibility | `useState` |
| Dropdown open/close | `useState` + `useRef` |

---

## Routing (React Router v6)

### Route Configuration

Routes defined in `App.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout appName="DS App">
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Add more routes here */}
    </Routes>
  );
}
```

### Protected Routes

Wrap protected content in `ProtectedRoute`:

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, login } = useAuth();
  const { t } = useTranslation();

  // Show spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="login-prompt">
        <button onClick={login}>{t('auth.loginWith')}</button>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
```

### Navigation

```tsx
import { Link, useNavigate } from 'react-router-dom';

// Declarative link
<Link to="/dashboard">Dashboard</Link>

// Programmatic navigation
const navigate = useNavigate();
navigate('/dashboard');
navigate(-1); // Go back
```

### Route Patterns

| Route | Page | Protection |
|-------|------|------------|
| `/` | Home | Public |
| `/dashboard` | Dashboard | Protected |
| `/settings` | Settings | Protected |
| `/admin/*` | Admin routes | Protected + role check |

---

## Tailwind CSS v3 Conventions

### Configuration (`tailwind.config.js`)

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',  // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        ds: {
          primary: '#2563eb',    // Blue
          secondary: '#64748b',  // Slate
          success: '#22c55e',    // Green
          warning: '#f59e0b',    // Amber
          danger: '#ef4444',     // Red
        }
      }
    },
  },
  plugins: [],
}
```

### CSS Variables (`styles/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --ds-primary: #2563eb;
  --ds-bg-primary: #ffffff;
  --ds-bg-secondary: #f9fafb;
  --ds-text-primary: #111827;
  --ds-text-secondary: #6b7280;
  --ds-border: #e5e7eb;
}

.dark {
  --ds-bg-primary: #1f2937;
  --ds-bg-secondary: #111827;
  --ds-text-primary: #f9fafb;
  --ds-text-secondary: #9ca3af;
  --ds-border: #374151;
}
```

### Component Classes

Custom utility classes using `@apply`:

```css
.btn {
  @apply px-4 py-2 rounded-md font-medium transition-colors 
         focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-ds-primary text-white hover:bg-blue-700 
         focus:ring-ds-primary;
}

.btn-secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 
         focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200;
}

.card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm 
         border border-gray-200 dark:border-gray-700 p-4;
}
```

### Usage in Components

```tsx
// ✅ Use utility classes directly
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  Click me
</button>

// ✅ Use custom component classes
<button className="btn btn-primary">
  Click me
</button>

// ✅ Use DS color palette
<div className="bg-ds-primary text-white">
  Brand colored
</div>

// ✅ Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// ✅ Dark mode variants
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

### Responsive Breakpoints

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile first |
| `sm:` | 640px | Landscape phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### Dark Mode Pattern

```tsx
// Element will be white in light mode, gray-800 in dark mode
<div className="bg-white dark:bg-gray-800">

// Text color changes
<p className="text-gray-900 dark:text-white">

// Border color changes
<div className="border border-gray-200 dark:border-gray-700">
```

### Common Patterns

```tsx
// Card with shadow
<div className="card">Content</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Flex with space between
<div className="flex justify-between items-center">

// Full-height page layout
<div className="min-h-screen flex flex-col">

// Centered content with max width
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Loading spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ds-primary">
```

---

## Build Configuration (Vite)

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to backend during development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",              // Start dev server
    "build": "tsc -b && vite build",  // Type-check and build
    "preview": "vite preview",   // Preview production build
    "test": "vitest",           // Run tests
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev
# → http://localhost:3000

# Run tests in watch mode
npm test

# Build for production
npm run build
# → Output in dist/

# Preview production build locally
npm run preview
```

### Environment Variables

Create `.env` files for environment-specific config:

```bash
# .env.development
VITE_API_URL=http://localhost:8080

# .env.production
VITE_API_URL=https://api.yourapp.com
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL || '';
```

---

## API Client (`api/client.ts`)

Singleton HTTP client with tenant header support:

```typescript
class ApiClient {
  private tenantId: string | null = null;

  setTenant(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add tenant header for multi-tenant requests
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',  // Send cookies for auth
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  put<T>(path: string, body: unknown): Promise<T> { return this.request<T>('PUT', path, body); }
  patch<T>(path: string, body: unknown): Promise<T> { return this.request<T>('PATCH', path, body); }
  delete<T>(path: string): Promise<T> { return this.request<T>('DELETE', path); }
}

export const api = new ApiClient();
```

Usage:
```typescript
import { api } from '../api/client';

// Get current user
const user = await api.get<User>('/api/me');

// Create item (includes X-Tenant-ID if set)
const item = await api.post<Item>('/api/items', { name: 'New Item' });
```

---

## Internationalization (i18n)

### Configuration (`i18n/config.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)           // Load translations via HTTP
  .use(LanguageDetector)      // Detect user language
  .use(initReactI18next)      // Bind to React
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false,     // React already escapes
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
```

### Translation Files

Location: `public/locales/{lang}/translation.json`

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "auth": {
    "loginWith": "Login with DSAccount",
    "unauthorized": "Please log in to continue"
  },
  "footer": {
    "copyright": "© {{year}} DigiStratum LLC. All rights reserved."
  }
}
```

### Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('footer.copyright', { year: 2026 })}</p>
    </div>
  );
}
```

---

## Testing

### Test Setup

Using Vitest with React Testing Library:

```typescript
// vitest.config.ts (or in vite.config.ts)
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

### Test Pattern

Tests reference requirement IDs from `REQUIREMENTS.md`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('FR-AUTH: Authentication', () => {
  /**
   * Tests FR-AUTH-002: Unauthenticated redirect
   */
  it('shows login button when not authenticated', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });
});
```

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once with coverage
npm run test:coverage

# Run specific test file
npx vitest auth.test.tsx
```

---

## Component Reference

### Layout Components

| Component | Import | Props | Description |
|-----------|--------|-------|-------------|
| `Layout` | `./components` | `appName`, `currentAppId`, `children` | Page wrapper |
| `DSNav` | `./components` | `appName`, `currentAppId` | Navigation header |
| `Footer` | `./components` | none | Standard footer |

### Hooks

| Hook | Import | Returns | Description |
|------|--------|---------|-------------|
| `useAuth` | `./hooks/useAuth` | `AuthContext` | Auth state & actions |
| `useTheme` | `./hooks/useTheme` | `ThemeContext` | Theme state & toggle |
| `useTranslation` | `react-i18next` | `{ t }` | Translation function |

### Page Structure Template

```tsx
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components';

export function MyPage() {
  const { t } = useTranslation();
  const { user, currentTenant } = useAuth();

  return (
    <Layout appName="My App">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('mypage.title')}
        </h1>
        
        <div className="card">
          {/* Page content */}
        </div>
      </div>
    </Layout>
  );
}
```

---

## Adding New Features

### New Page Checklist

1. Create `src/pages/NewPage.tsx`
2. Add route in `App.tsx`
3. Add translations to `public/locales/*/translation.json`
4. Wrap in `Layout` (or `ProtectedRoute` + `Layout` if protected)
5. Add tests in `src/__tests__/`

### New Component Checklist

1. Create `src/components/ComponentName.tsx`
2. Export from `src/components/index.ts`
3. Define TypeScript props interface
4. Use Tailwind classes for styling
5. Support dark mode variants
6. Add aria labels for accessibility

### New Hook Checklist

1. Create `src/hooks/useHookName.tsx`
2. Define context interface in `types.ts`
3. Create context, provider, and hook
4. Add provider to hierarchy in `App.tsx` if global
5. Document usage

---

*Last updated: 2026-02-19*
