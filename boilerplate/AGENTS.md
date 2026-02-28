# Agentic Development Guidelines - {{APP_NAME}}

> Guidelines for AI agents working on this codebase.
> For comprehensive patterns and workflows, refer to the [ds-app-developer](https://github.com/DigiStratum/ds-app-developer) repository.

---

## Quick Start for Agents

Before making any changes:

1. **Read [REQUIREMENTS.md](./REQUIREMENTS.md)** — Source of truth for what the app must do
2. **Read this file** — How to work on the code
3. **Check `docs/ARCHITECTURE.md`** — Understand the patterns (if exists)
4. **Review recent commits** — `git log --oneline -20`

---

## Reference Documentation

This app follows patterns established in **ds-app-developer**. For detailed guidance on:

- **TDD Workflow**: Red → Green → Refactor cycle
- **Requirements Traceability**: FR-XXX-NNN and NFR-XXX-NNN format
- **Multi-Tenant Patterns**: Tenant-scoped queries, context propagation
- **SSO Integration**: DSAccount authentication flow
- **Error Handling**: Standard error response format
- **Git Commits**: `type(scope): description [REQ-ID] (#issue)`

See: https://github.com/DigiStratum/ds-app-developer/blob/main/AGENTS.md

---

## Project Structure

```
{{APP_NAME}}/
├── REQUIREMENTS.md      # What the app must do (source of truth)
├── AGENTS.md           # This file
├── README.md           # Setup and overview
│
├── backend/            # Go Lambda handlers
│   ├── cmd/api/        # Entry point
│   ├── internal/       # Private packages
│   └── pkg/            # Shared packages (copy from ds-app-developer)
│
├── frontend/           # React + TypeScript + Vite
│   └── src/
│
└── docs/               # Detailed documentation
```

---

## Coding Standards

### Go Backend
- Error wrapping with context: `fmt.Errorf("...: %w", err)`
- Structured logging: `slog.Info()`
- Table-driven tests
- Tenant-scoped queries

### React Frontend
- Functional components with hooks
- Tailwind CSS for styling
- Internationalized strings
- TypeScript for type safety
- **AppShell pattern** for consistent layout (see below)

---

## AppShell Integration Pattern

This app uses AppShell from `@digistratum/layout` for consistent layout across DigiStratum apps.

### Key Files
- `src/components/MyAppShell.tsx` - App-specific shell wrapper
- `src/App.tsx` - Route definitions with shell integration

### Pattern Overview

```tsx
// 1. Wrap your routes with MyAppShell
<MyAppShell>
  <YourPageContent />
</MyAppShell>

// 2. Protected routes combine ProtectedRoute + MyAppShell
<ProtectedRoute>
  <MyAppShell>
    <ProtectedPageContent />
  </MyAppShell>
</ProtectedRoute>
```

### Customization Points

1. **Navigation Items**: Edit `getMenuItems()` in `MyAppShell.tsx`
2. **App Branding**: Pass `customHeaderContent` prop for CustomHeaderZone
3. **Feature Toggles**: Control visibility via props (showAppSwitcher, showThemeToggle, etc.)
4. **Custom Footer**: Replace default DSFooter if needed

### Reference Implementation
See `ds-app-developer/frontend/src/components/DeveloperAppShell.tsx` for the canonical pattern.

---

## Common Commands

```bash
# Backend
cd backend && go run ./cmd/api
cd backend && go test ./...

# Frontend
cd frontend && npm run dev
cd frontend && npm test

# Build
make build  # If Makefile exists
```

---

## When Stuck

1. Re-read REQUIREMENTS.md
2. Check existing patterns in ds-app-developer
3. Run tests to understand expected behavior
4. Trace the flow from entry point

---

*This document is AI-friendly by design. Agents: load this file at the start of every session.*
