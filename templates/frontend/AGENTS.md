# Frontend — AGENTS.md

## ⛔ PROTECTED PATHS — DO NOT MODIFY

The following paths contain shared infrastructure loaded from CDN. **Never modify, copy, inline, or replace these files:**

```
src/shell/           # CDN shell loader mechanism
src/main.tsx         # App entry point (shell bootstrap)
```

**Why:** The AppShell (header, footer, navigation chrome) is loaded at runtime from a central CDN. This ensures all ecosystem apps stay consistent. If you modify the loader or try to "bring the shell local," you break the ecosystem update model.

**If you think you need to modify these:** You don't. Use the extension points below instead.

---

## ✅ HOW TO EXTEND THE APP

All app-specific customization goes through `src/app/Layout.tsx`. This file configures how your app integrates with the AppShell.

### Adding Menu Items

Edit `getMenuItems()` in `Layout.tsx`:

```tsx
const getMenuItems = (authUser: User | null, tenant: Tenant | null): MenuItem[] => {
  const items: MenuItem[] = [];
  
  items.push({
    id: 'my-feature',
    label: 'My Feature',
    path: '/my-feature',
    icon: '🚀',
    active: location.pathname === '/my-feature',
  });
  
  return items;
};
```

### Adding Custom Header Content

Use the `customHeader` prop in `Layout.tsx`:

```tsx
<AppShell
  customHeader={<MyAppSpecificBanner />}
>
```

### Adding User Menu Content

Use the `menuContent` prop for extra dropdown items:

```tsx
<AppShell
  menuContent={<MyExtraMenuItems />}
>
```

### Adding Pages/Routes

1. Create component in `src/app/pages/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add menu item via `getMenuItems()` (see above)

---

## Project Structure

```
src/
├── app/              # YOUR APP CODE
│   ├── Layout.tsx    # AppShell config, menu items
│   ├── pages/        # Route components
│   └── features/     # Feature modules
├── shell/            # CDN loader — DON'T TOUCH
├── main.tsx          # Entry point — DON'T TOUCH
└── App.tsx           # Routes — extend here
```

---

## Hooks Quick Reference

| Hook | Purpose |
|------|---------|
| `useAuth()` | User, tenant, login/logout |
| `useTheme()` | Theme state, toggle |
| `usePrefs()` | User preferences |
| `useI18n()` | Translations |

---

## Styling

- Use Tailwind CSS classes
- Theme-aware: use `dark:` variants for dark mode
- Design tokens come from AppShell (colors, spacing)

---

## Testing

```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests (requires backend running)
```

---

## Common Patterns

### Protected Route

```tsx
import { RequireAuth } from '@digistratum/ds-core';

<Route path="/admin" element={
  <RequireAuth roles={['admin']}>
    <AdminPage />
  </RequireAuth>
} />
```

### Tenant-Aware Component

```tsx
const { currentTenant } = useAuth();
if (!currentTenant) return <SelectTenantPrompt />;
```

---

## References

| Doc | Purpose |
|-----|---------|
| [COMPONENTS.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/COMPONENTS.md) | Shared component library |
| [THEMING.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/THEMING.md) | Theme customization |
| [I18N.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/I18N.md) | Internationalization |
| [ACCESSIBILITY.md](https://github.com/DigiStratum/ds-app-developer/blob/main/docs/ACCESSIBILITY.md) | A11y requirements |
