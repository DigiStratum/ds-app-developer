/**
 * @digistratum/ds-core - Constants
 * 
 * Shared runtime constants for DigiStratum applications.
 */

/**
 * DigiStratum service URLs
 */
export const DS_URLS = {
  /** DSAccount SSO service */
  ACCOUNT: 'https://account.digistratum.com',
  /** Privacy policy page */
  PRIVACY: 'https://www.digistratum.com/privacy',
  /** Terms of service page */
  TERMS: 'https://www.digistratum.com/terms',
  /** Support page */
  SUPPORT: 'https://www.digistratum.com/support',
  /** Main website */
  WEBSITE: 'https://www.digistratum.com',
} as const;

/**
 * Storage keys used by DS libraries
 */
export const STORAGE_KEYS = {
  /** Theme preference */
  THEME: 'ds-theme',
  /** Cookie consent level */
  COOKIE_CONSENT: 'ds-cookie-consent',
  /** Current tenant ID */
  CURRENT_TENANT: 'ds_currentTenant',
  /** Feature flags cache */
  FEATURE_FLAGS: 'ds-feature-flags',
  /** Tenant theme cache */
  TENANT_THEME: 'ds-tenant-theme',
} as const;

/**
 * Default timeouts (in milliseconds)
 */
export const TIMEOUTS = {
  /** Theme fetch timeout */
  THEME_FETCH: 2500,
  /** Feature flags cache TTL */
  FLAGS_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * CSS custom property names used by DS theming
 */
export const CSS_VARS = {
  /** Primary brand color */
  PRIMARY: '--ds-primary',
  /** Secondary brand color */
  SECONDARY: '--ds-secondary',
  /** Background margin color */
  BG_MARGIN: '--ds-bg-margin',
  /** Container border radius */
  CONTAINER_RADIUS: '--ds-container-radius',
} as const;
