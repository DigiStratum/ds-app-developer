# DS AppShell Standard

**Canonical reference for what belongs in the shared AppShell vs. app-specific code.**

## Auth Flow (Apps)

Apps **consume** auth state — they don't produce it.

```
Check: do I have `ds-session` cookie?
├─ YES → Call Account API to get session details
│        └─ Session valid? 
│           ├─ YES → state = `authenticated`
│           └─ NO  → state = `public`
└─ NO  → state = `public`

If authenticated: show My Account + Sign Out
If public: show Sign In
```

**Critical rules**:
- Apps **DO NOT** touch the `ds-session` cookie — Account app produces it
- Apps **DO NOT** use localStorage for auth state
- Apps **DO NOT** create their own auth cookies
- Sign In / My Account / Sign Out all **redirect to Account app**
- Account app manages session state and produces `ds-session` cookie

**`ds-prefs` cookie**: Currently app-managed (lang/theme/gdpr), but ideally Account API produces this too — apps just consume.

---

## Layout Structure

All DS apps share this identical structure:

```
┌─────────────────────────────────────────────────────────┐
│ [Custom Header Slot] (app-injectable)                   │
├─────────────────────────────────────────────────────────┤
│ Header: Logo + Hamburger Menu                           │
├─────────────────────────────────────────────────────────┤
│ [Ad Slot 1] (margin)                                    │
├─────────────────────────────────────────────────────────┤
│ Content Container                                       │
│   └─ App-specific content mounts here                   │
├─────────────────────────────────────────────────────────┤
│ [Ad Slot 2] (margin)                                    │
├─────────────────────────────────────────────────────────┤
│ Footer: Copyright + Resource Links + GDPR              │
└─────────────────────────────────────────────────────────┘
```

## Menu Structure

Two floating/stacking sections with titles:

### 1. ACCOUNT Section (Standard - NOT app-specific)
- **Auth State**:
  - Guest: "Sign In" button
  - Authenticated: "My Account" link + "Sign Out" button
- **Preferences**:
  - Language selector
  - Appearance (theme) toggle
  - Future: other accessibility controls

### 2. APPS Section
- **User's App Subscriptions**: Conditional links based on auth/subscription data
- **Standard Apps** (always shown):
  - Developers (developer.digistratum.com)
- **Current App Menu Items**: App-specific options nested under the current app
  - Apps inject these via a standard integration hook

## Content Container Behavior

1. **Default state**: Show "Loading App..." with spinner
2. **After app mounts**: Hide loading indicator, show app content
3. **All app frontend injects into this container** — no app UI outside except:
   - Custom header slot injection
   - Menu item injection
   - Ad slot content

## Footer (Standard - NOT app-specific)

- Copyright notice
- Resource links (Privacy, Terms, Support)
- GDPR cookie preferences (integrated with `ds-prefs` cookie)

## `ds-prefs` Cookie

Single unified cookie: `{lang}|{theme}|{gdpr-consent}`
- Base64 encoded, URL-encoded for storage
- Shared across `.digistratum.com`

---

## What Apps Customize

1. **App name/ID** (for highlighting in app switcher)
2. **App-specific menu items** (injected under current app in APPS section)
3. **Custom header slot content** (optional)
4. **Ad slot content** (optional)
5. **Routes and page content** (mounts in content container)

## What Apps DO NOT Customize

- Sign In / Sign Out UI (handled by AppShell)
- My Account link (handled by AppShell)
- Language/Theme preferences UI (handled by AppShell)
- Footer structure (handled by AppShell)
- GDPR banner (handled by AppShell)
- Standard app links (handled by AppShell)

---

## Implementation Location

| Component | Package | Notes |
|-----------|---------|-------|
| AppShell | `@digistratum/layout` | Main wrapper |
| DSHeader | `@digistratum/layout` | Header with menu |
| DSFooter | `@digistratum/layout` | Footer with GDPR |
| GdprBanner | `@digistratum/layout` | Cookie consent |
| useAuth | `@digistratum/ds-core` | Auth state/actions |
| usePrefs | `@digistratum/ds-core` | Prefs (lang/theme/gdpr) |
| useTheme | `@digistratum/ds-core` | Theme management |

Apps import `AppShell` and pass:
- `appName`, `currentAppId`
- `getMenuItems()` callback for app-specific menu items
- `children` for content

---

## Current Implementation Status

### Auth Flow — COMPLIANT ✓

| Aspect | Standard | Current | Status |
|--------|----------|---------|--------|
| Session cookie | Account produces, apps consume | Apps read ds_session | ✓ |
| Session validation | Call Account API | Backend calls /api/auth/me | ✓ |
| Sign In | → Account app | /api/auth/login → account.digistratum.com | ✓ |
| My Account | → Account app | Links to DS_URLS.ACCOUNT | ✓ |
| Sign Out | → Account app | /api/auth/logout → clears session | ✓ |
| No localStorage for auth | Only ds-session cookie | localStorage only for tenant pref | ✓ |

### Architecture Gap — NEEDS REFACTOR

**Problem**: Auth logic is in app's `boilerplate/useAuth.tsx`, not in shared packages.

**Current state**:
- Each app copies `useAuth.tsx` from boilerplate
- Apps construct `AuthContext` and pass to AppShell
- If app forgets to pass `auth`, Sign In doesn't show

**Required refactor**:
1. Move `useAuth` hook to `@digistratum/ds-core`
2. `AppShell` wraps content in `AuthProvider` internally
3. `DSHeader` calls `useAuth()` directly — no `auth` prop needed
4. Apps only pass: `appName`, `currentAppId`, `getMenuItems`, `children`

**Benefit**: Auth "just works" — apps can't accidentally break it.
