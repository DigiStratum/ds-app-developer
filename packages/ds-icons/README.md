# @digistratum/ds-icons

CSS-based icon system for DigiStratum apps using mask-image technique.

## Features

- **Inherits text color** — icons automatically match surrounding text via `currentColor`
- **Scalable** — size variants or custom CSS width/height
- **Lightweight** — no JS runtime, just CSS
- **Consistent** — standardized icons across all DS apps

## Usage

### Import CSS

```tsx
// In your app entry or layout
import '@digistratum/ds-icons/dist/icons.css';
```

Or in HTML:
```html
<link rel="stylesheet" href="/path/to/icons.css">
```

### Use icons

```html
<span class="ds-icon ds-icon-sun"></span>
<span class="ds-icon ds-icon-moon"></span>
<span class="ds-icon ds-icon-user ds-icon-lg"></span>
```

### Size variants

| Class | Size |
|-------|------|
| `ds-icon-xs` | 0.75rem (12px) |
| `ds-icon-sm` | 1rem (16px) |
| `ds-icon-md` | 1.25rem (20px) - default |
| `ds-icon-lg` | 1.5rem (24px) |
| `ds-icon-xl` | 2rem (32px) |

### With Tailwind

Icons work with Tailwind utility classes:
```html
<span class="ds-icon ds-icon-check text-green-500 w-6 h-6"></span>
```

## Available Icons

| Icon | Class |
|------|-------|
| ☰ Menu | `ds-icon-bars-3` |
| ✕ Close | `ds-icon-x-mark` |
| ✓ Check | `ds-icon-check` |
| ☀ Sun | `ds-icon-sun` |
| ☽ Moon | `ds-icon-moon` |
| 🌐 Globe | `ds-icon-globe-alt` |
| ⚙ Settings | `ds-icon-cog-6-tooth` |
| ☰ Adjustments | `ds-icon-adjustments-horizontal` |
| → Logout | `ds-icon-arrow-right-on-rectangle` |
| 👤 User | `ds-icon-user` |
| 🏢 Building | `ds-icon-building-office` |
| 📄 Document | `ds-icon-document-text` |
| 💳 Credit Card | `ds-icon-credit-card` |
| 📶 Signal | `ds-icon-signal` |
| 🏠 Home | `ds-icon-home` |
| 🔍 Search | `ds-icon-magnifying-glass` |
| + Plus | `ds-icon-plus` |
| − Minus | `ds-icon-minus` |
| ✎ Pencil | `ds-icon-pencil` |
| 🗑 Trash | `ds-icon-trash` |
| ← Arrow Left | `ds-icon-arrow-left` |
| → Arrow Right | `ds-icon-arrow-right` |
| ‹ Chevron Left | `ds-icon-chevron-left` |
| › Chevron Right | `ds-icon-chevron-right` |
| ▾ Chevron Down | `ds-icon-chevron-down` |
| ℹ Info | `ds-icon-information-circle` |
| ⚠ Warning | `ds-icon-exclamation-triangle` |
| ✓ Success | `ds-icon-check-circle` |
| ✕ Error | `ds-icon-x-circle` |
| ▦ Grid | `ds-icon-squares-2x2` |

## Adding new icons

1. Add SVG to `svg/` directory (Heroicons outline format)
2. Run `npm run build`
3. New icon available as `ds-icon-{filename}`

## Credits

Icons sourced from [Heroicons](https://heroicons.com/) (MIT License) by Tailwind Labs.
