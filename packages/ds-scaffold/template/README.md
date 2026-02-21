# {{APP_NAME}}

A DigiStratum application built with the DS scaffold template.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Project Structure

```
{{APP_NAME_KEBAB}}/
├── src/
│   ├── api/           # API client and utilities
│   ├── components/    # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── UserMenu.tsx
│   ├── hooks/         # Custom React hooks
│   │   └── useAuth.tsx
│   ├── pages/         # Page components
│   │   ├── Home.tsx
│   │   ├── About.tsx
│   │   └── NotFound.tsx
│   ├── i18n/          # Internationalization
│   ├── styles/        # Global styles
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Entry point
├── cdk/               # AWS CDK deployment
├── public/            # Static assets
├── docs/              # Documentation
└── package.json
```

## Features

### Authentication (SSO)

Authentication is handled via DSAccount SSO. The `useAuth` hook provides:

```tsx
const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
```

### Theme Support

Light/dark mode is provided by `@digistratum/ds-core`. Theme persists in localStorage.

```tsx
const { theme, toggleTheme } = useTheme();
```

### GDPR Consent

Cookie consent banner from `@digistratum/ds-ui` is included by default:

```tsx
<GdprBanner privacyPolicyUrl="/privacy" />
```

### Multi-Tenant Support

Organization/tenant switching is built into the auth system:

```tsx
const { currentTenant, switchTenant, user } = useAuth();
// user.tenants contains available organizations
```

### Internationalization

i18n is configured with react-i18next:

```tsx
const { t } = useTranslation();
return <h1>{t('home.title', 'Default Title')}</h1>;
```

## Customization

See [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md) for details on:
- Adding new pages
- Creating components
- Modifying the theme
- Adding backend API routes

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) for AWS deployment instructions.

## Dependencies

- **@digistratum/ds-core** - Shared utilities, hooks, and components
- **@digistratum/ds-ui** - UI components (GDPR banner, navigation, etc.)
- **react-router-dom** - Client-side routing
- **react-i18next** - Internationalization
- **Tailwind CSS** - Styling

## License

Proprietary - DigiStratum LLC
