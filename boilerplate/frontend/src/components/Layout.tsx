/**
 * @deprecated This file is kept for reference. Use MyAppShell instead.
 * 
 * The new pattern uses AppShell from @digistratum/layout via MyAppShell.
 * See: src/components/MyAppShell.tsx
 * 
 * Migration:
 * - Replace `<Layout>` with `<MyAppShell>`
 * - Remove `<Outlet />` - children are passed directly to MyAppShell
 * - See ds-app-developer DeveloperAppShell for the canonical reference implementation
 */
export { MyAppShell as default } from './MyAppShell';
