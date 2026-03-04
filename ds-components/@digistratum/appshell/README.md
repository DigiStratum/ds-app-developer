# @digistratum/appshell

DigiStratum AppShell - Complete app layout system with header, footer, navigation, and GDPR compliance.

## Installation

### Using ds-components CLI

```bash
# Pull from registry
ds-components pull @digistratum/appshell

# Or sync via manifest
# Add to ds-components.json:
{
  "components": {
    "@digistratum/appshell": "^1.0.0"
  }
}

ds-components sync
```

### Peer Dependencies

This component requires the following peer dependencies:

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-i18next": "^13.0.0",
  "i18next": "^23.0.0",
  "@digistratum/ds-core": "^0.1.0"
}
```

## Usage

### Basic AppShell

```tsx
import { AppShell } from '@digistratum/appshell';

function App() {
  const getMenuItems = (user, tenant) => [
    { id: 'home', label: 'Home', path: '/', icon: '🏠' },
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: '📊' },
  ];

  return (
    <AppShell
      appName="MyApp"
      currentAppId="myapp"
      auth={authContext}
      theme={themeContext}
      getMenuItems={getMenuItems}
    >
      <YourAppContent />
    </AppShell>
  );
}
```

### With Custom Header and Footer

```tsx
import { AppShell, DSHeader, DSFooter } from '@digistratum/appshell';

function App() {
  return (
    <AppShell
      appName="MyApp"
      customHeader={<AnnouncementBanner />}
      customFooter={<CustomFooter />}
    >
      <Content />
    </AppShell>
  );
}
```

### Using Individual Components

```tsx
import { DSHeader, DSFooter, GdprBanner } from '@digistratum/appshell';

function CustomLayout() {
  return (
    <div>
      <DSHeader
        appName="MyApp"
        auth={authContext}
        theme={themeContext}
        showAppSwitcher
        showThemeToggle
      />
      
      <main>{/* Your content */}</main>
      
      <DSFooter
        appName="MyApp"
        showGdprBanner
        appVersion="1.0.0"
      />
    </div>
  );
}
```

## Components

### AppShell

The main layout wrapper that orchestrates all zones.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | `string` | `'App'` | Display name for the app |
| `currentAppId` | `string` | - | App ID for highlighting in app-switcher |
| `auth` | `AuthContext` | - | Authentication context |
| `theme` | `ThemeContext` | - | Theme context |
| `getMenuItems` | `function` | - | Callback to generate menu items |
| `hideHeader` | `boolean` | `false` | Hide the DS Header |
| `hideFooter` | `boolean` | `false` | Hide the DS Footer |
| `showGdprBanner` | `boolean` | `true` | Show GDPR consent banner |

### DSHeader

Standard DigiStratum navigation header with app switcher, theme toggle, and user menu.

### DSFooter

Standard footer with copyright, links, and optional GDPR banner.

### GdprBanner / CookiePreferencesModal

GDPR-compliant cookie consent components.

## Zone Visibility

Control which zones are visible:

```tsx
<AppShell
  hideCustomHeader  // Hide custom header zone
  hideHeader        // Hide the entire header
  hideNavigation    // Hide navigation in header
  hideFooter        // Hide the footer
>
  <FullscreenContent />
</AppShell>
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --ds-bg-margin: #f3f4f6;
  --ds-container-radius: 8px;
}
```

## License

MIT © DigiStratum LLC
