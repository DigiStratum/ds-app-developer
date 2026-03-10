# AGENTS.md — {{APP_NAME}}

## What This App Is

A {{ECOSYSTEM_NAME}} application that runs on the DS AppShell platform.

## The Cardinal Rule: Do NOT Modify AppShell Concerns

**AppShell handles:** Header, footer, navigation, auth UI, theme, preferences, GDPR, legal links.

**You handle:** App-specific routes, pages, features, business logic.

**DO NOT:**
- ❌ Create custom header/footer components
- ❌ Implement your own auth UI (Sign In/Out buttons)
- ❌ Add GDPR banners or legal links
- ❌ Modify files in `frontend/src/shell/`

**DO:**
- ✅ Add pages in `frontend/src/app/pages/`
- ✅ Add features in `frontend/src/app/features/`
- ✅ Customize menu items in `Layout.tsx` → `getMenuItems()`
- ✅ Use hooks from `@digistratum/ds-core`

## Structure

```
frontend/src/
├── app/                 # ← YOUR CODE GOES HERE
│   ├── Layout.tsx       # Wraps AppShell, defines app menu
│   ├── pages/           # Your routes
│   ├── features/        # Your features
│   └── config.ts        # App configuration
├── shell/               # ← DON'T TOUCH (CDN shell loader)
└── App.tsx              # Root (add routes here)
```

## Key Imports

```tsx
// Auth, theme, preferences
import { useAuth, useTheme, usePrefs } from '@digistratum/ds-core';

// Shell components (rarely needed in app code)
import { AppShell } from '@digistratum/layout';
```

## Adding a New Page

1. Create `frontend/src/app/pages/MyPage.tsx`
2. Add route in `App.tsx`:
   ```tsx
   <Route path="/mypage" element={<MyPage />} />
   ```
3. Add menu item in `Layout.tsx` → `getMenuItems()`:
   ```tsx
   items.push({
     id: 'mypage',
     label: 'My Page',
     path: '/mypage',
     icon: '📄',
   });
   ```

## Backend

Go Lambda API in `backend/`. Add handlers in `backend/internal/api/`.

## Deployment

Push to `main` → CI builds → deploys to AWS automatically.
