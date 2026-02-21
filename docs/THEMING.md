# Theming System

The DS App Developer supports dynamic theming with tenant and user-level customization. This document explains how to configure and use the theming system.

## Overview

The theming system is built on CSS custom properties (CSS variables), allowing runtime customization without rebuilding the application. Themes can be applied at three levels:

1. **Default Theme** - Base CSS variables defined in `globals.css`
2. **Tenant Theme** - Organization-specific branding fetched from `/api/theme`
3. **User Theme** - (Future) Per-user preferences stored in user settings

## CSS Custom Properties

All themeable values are defined as CSS custom properties in `frontend/src/styles/globals.css`.

### Brand Colors

Primary palette for tenant customization:

| Property | Default (Light) | Description |
|----------|----------------|-------------|
| `--ds-primary` | `#2563eb` | Primary brand color (buttons, links, focus) |
| `--ds-primary-hover` | `#1d4ed8` | Primary hover state |
| `--ds-primary-light` | `#3b82f6` | Lighter primary variant |
| `--ds-secondary` | `#64748b` | Secondary color |
| `--ds-secondary-hover` | `#475569` | Secondary hover state |
| `--ds-accent` | `#8b5cf6` | Accent/highlight color |
| `--ds-accent-hover` | `#7c3aed` | Accent hover state |

### Semantic Colors

Consistent across themes (generally not overridden):

| Property | Value | Description |
|----------|-------|-------------|
| `--ds-success` | `#22c55e` | Success states |
| `--ds-warning` | `#f59e0b` | Warning states |
| `--ds-danger` | `#ef4444` | Error/danger states |
| `--ds-info` | `#0ea5e9` | Informational states |

### Background Colors

| Property | Light | Dark | Description |
|----------|-------|------|-------------|
| `--ds-bg-primary` | `#ffffff` | `#1f2937` | Main content background |
| `--ds-bg-secondary` | `#f9fafb` | `#111827` | Page/app background |
| `--ds-bg-tertiary` | `#f3f4f6` | `#0f172a` | Subtle background variation |
| `--ds-bg-elevated` | `#ffffff` | `#374151` | Elevated surfaces (modals, cards) |

### Text Colors

| Property | Light | Dark | Description |
|----------|-------|------|-------------|
| `--ds-text-primary` | `#111827` | `#f9fafb` | Primary text |
| `--ds-text-secondary` | `#6b7280` | `#9ca3af` | Secondary/muted text |
| `--ds-text-tertiary` | `#9ca3af` | `#6b7280` | Tertiary text |
| `--ds-text-link` | `var(--ds-primary)` | — | Link text color |

### Border & Shadow

| Property | Light | Dark | Description |
|----------|-------|------|-------------|
| `--ds-border` | `#e5e7eb` | `#374151` | Default borders |
| `--ds-shadow-sm` | — | — | Small shadow |
| `--ds-shadow` | — | — | Default shadow |
| `--ds-shadow-md` | — | — | Medium shadow |
| `--ds-shadow-lg` | — | — | Large shadow |

### Spacing & Radius

| Property | Value | Description |
|----------|-------|-------------|
| `--ds-spacing-xs` | `0.25rem` | Extra small spacing |
| `--ds-spacing-sm` | `0.5rem` | Small spacing |
| `--ds-spacing-md` | `1rem` | Medium spacing |
| `--ds-spacing-lg` | `1.5rem` | Large spacing |
| `--ds-spacing-xl` | `2rem` | Extra large spacing |
| `--ds-radius` | `0.375rem` | Default border radius |
| `--ds-radius-lg` | `0.75rem` | Large border radius |

## Theme API

### GET /api/theme

Returns the theme configuration for the current session's tenant.

**Response:**
```json
{
  "cssVars": {
    "--ds-primary": "#ff6600",
    "--ds-accent": "#00cc66"
  },
  "logoUrl": "https://example.com/logo.svg",
  "logoAlt": "Company Name",
  "faviconUrl": "https://example.com/favicon.ico"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `cssVars` | `object` | CSS custom property overrides |
| `logoUrl` | `string\|null` | Custom logo URL (null = use default) |
| `logoAlt` | `string` | Alt text for logo |
| `faviconUrl` | `string\|null` | Custom favicon URL |

**Notes:**
- Returns empty object `{}` if no custom theme configured
- Response is cached for 5 minutes (client-side and CDN)
- Frontend times out after 2.5s and falls back to defaults

## Frontend Integration

### useTenantTheme Hook

The `useTenantTheme` hook handles fetching and applying tenant themes:

```tsx
import { useTenantTheme } from '../hooks/useTenantTheme';

function MyComponent() {
  const { logoUrl, isLoading, error, refresh } = useTenantTheme();
  
  return (
    <img src={logoUrl || '/default-logo.svg'} alt="Logo" />
  );
}
```

**Hook Return Values:**

| Property | Type | Description |
|----------|------|-------------|
| `theme` | `TenantThemeConfig` | Full theme configuration |
| `logoUrl` | `string\|null` | Logo URL or null for default |
| `isLoading` | `boolean` | True while fetching |
| `error` | `string\|null` | Error message if failed |
| `refresh` | `function` | Force refresh from server |

### How It Works

1. On mount, checks `sessionStorage` for cached theme
2. Fetches `/api/theme` with 2.5s timeout
3. Injects CSS overrides as `<style id="ds-tenant-theme">` element
4. Updates favicon if custom URL provided
5. Caches response in `sessionStorage` for navigation

## Configuring Tenant Themes

### Logo Requirements

| Format | Recommendation |
|--------|----------------|
| **Preferred** | SVG (scales perfectly) |
| **Acceptable** | PNG with transparency |
| **Dimensions** | Height: 40px (rendered), source: 80-160px |
| **Aspect Ratio** | Flexible, but keep under 4:1 |
| **File Size** | Under 50KB |
| **Colors** | Should work on both light and dark backgrounds |

### DynamoDB Schema (Future)

Theme records will be stored in DynamoDB:

```
Table: ds-themes
Partition Key: tenant_id (String)

Attributes:
- tenant_id: String (PK)
- css_vars: Map<String, String>
- logo_url: String
- logo_alt: String
- favicon_url: String
- updated_at: String (ISO 8601)
- updated_by: String (user_id)
```

### Example Theme Configuration

```json
{
  "tenant_id": "acme-corp",
  "css_vars": {
    "--ds-primary": "#e11d48",
    "--ds-primary-hover": "#be123c",
    "--ds-accent": "#f97316"
  },
  "logo_url": "https://cdn.acme.com/logo.svg",
  "logo_alt": "ACME Corporation",
  "favicon_url": "https://cdn.acme.com/favicon.ico"
}
```

## Dark Mode

The theming system works seamlessly with dark mode:

1. Base CSS defines both `:root` (light) and `.dark` theme values
2. Tenant overrides apply to both themes automatically
3. To override dark-mode specific values, use the `.dark` selector in custom CSS (future feature)

## Best Practices

### For Developers

1. **Always use CSS variables** for colors and spacing in components
2. **Don't hardcode colors** - use `var(--ds-*)` properties
3. **Test both themes** - verify components look good in light and dark
4. **Graceful fallback** - assume theme API might fail

### For Tenant Admins

1. **Test your colors** - ensure sufficient contrast (WCAG AA)
2. **Use SVG logos** - they scale perfectly
3. **Keep it subtle** - override 2-3 colors max for cohesive look
4. **Preview before deploying** - themes affect all users

## Troubleshooting

### Theme not applying

1. Check browser DevTools for `<style id="ds-tenant-theme">`
2. Verify `/api/theme` returns expected config
3. Check `sessionStorage` for stale cache (clear with `refresh()`)
4. Confirm CSS property names match exactly (case-sensitive)

### Logo issues

1. Verify URL is accessible (no CORS issues)
2. Check image dimensions (should be ~40px height rendered)
3. Test on both light and dark backgrounds
4. Ensure no ad blocker interference

### Performance concerns

1. Theme is cached in `sessionStorage` (no re-fetch on navigation)
2. API response cached for 5 minutes
3. 2.5s timeout prevents blocking
4. CSS injection is minimal overhead
