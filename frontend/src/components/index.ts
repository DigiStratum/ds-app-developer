export { AdSlot } from './AdSlot';
export { CookieConsent } from './CookieConsent';
export { DSNav } from './DSNav';
export { Footer } from './Footer';
export { Layout } from './Layout';

// Remote shell components for App Shell Architecture (#911, #913, #914)
export { 
  RemoteShellWrapper, 
  ShellLayout, 
  useShellLayout,
  default as RemoteShellWrapperDefault 
} from './RemoteShellWrapper';
export { localShellModule } from './LocalShellAdapter';

// Re-exported from @digistratum/ds-core for backwards compatibility
export { FeatureFlag, withFeatureFlag } from './FeatureFlag';
export { ErrorBoundary } from '@digistratum/ds-core';

// Standardized reusable components for DS apps
export { DeveloperHeader } from './DeveloperHeader';
export type { DeveloperHeaderProps, MenuItem } from './DeveloperHeader';
export { DeveloperFooter, GdprBanner } from './DeveloperFooter';
export type { DeveloperFooterProps, FooterLink } from './DeveloperFooter';

// AppShell reference implementation (#593)
export { DeveloperAppShell } from './DeveloperAppShell';
