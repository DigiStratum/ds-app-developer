/**
 * GDPR Cookie Utilities
 * Handles reading/writing consent to a cross-domain cookie for *.ds.com
 */

import type { GdprConsent, GdprPreferences } from './types';

/** Cookie name for GDPR consent */
export const GDPR_COOKIE_NAME = 'ds_gdpr_consent';

/** Cookie domain - scoped to all *.ds.com subdomains */
export const GDPR_COOKIE_DOMAIN = '.ds.com';

/** Cookie expiry in days (1 year) */
export const GDPR_COOKIE_EXPIRY_DAYS = 365;

/** Cookie expiry in milliseconds */
export const GDPR_COOKIE_EXPIRY_MS = GDPR_COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Check if we're in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Check if we're on a ds.com domain (for production cookie setting)
 */
export const isDsComDomain = (): boolean => {
  if (!isBrowser()) return false;
  return window.location.hostname.endsWith('.ds.com') || 
         window.location.hostname === 'ds.com';
};

/**
 * Get the appropriate cookie domain based on current hostname
 * Returns .ds.com for production, or current hostname for development
 */
export const getCookieDomain = (): string => {
  if (!isBrowser()) return GDPR_COOKIE_DOMAIN;
  
  const hostname = window.location.hostname;
  
  // Production: use .ds.com for cross-subdomain sharing
  if (hostname.endsWith('.ds.com') || hostname === 'ds.com') {
    return GDPR_COOKIE_DOMAIN;
  }
  
  // Development: localhost or other domains - don't set domain (use current)
  // Returning empty string means we won't set domain attribute
  return '';
};

/**
 * Read GDPR consent from cookie
 */
export const readConsent = (): GdprConsent | null => {
  if (!isBrowser()) return null;
  
  try {
    const cookies = document.cookie.split(';');
    const consentCookie = cookies
      .map(c => c.trim())
      .find(c => c.startsWith(`${GDPR_COOKIE_NAME}=`));
    
    if (!consentCookie) return null;
    
    const value = consentCookie.substring(GDPR_COOKIE_NAME.length + 1);
    const decoded = decodeURIComponent(value);
    const consent = JSON.parse(decoded) as GdprConsent;
    
    // Validate structure
    if (typeof consent.accepted !== 'boolean' || typeof consent.timestamp !== 'number') {
      console.warn('[GDPR] Invalid consent cookie structure, clearing');
      clearConsent();
      return null;
    }
    
    // Check if consent has expired (1 year from timestamp)
    const expiryTime = consent.timestamp + GDPR_COOKIE_EXPIRY_MS;
    if (Date.now() > expiryTime) {
      console.info('[GDPR] Consent has expired, clearing');
      clearConsent();
      return null;
    }
    
    return consent;
  } catch (error) {
    console.error('[GDPR] Error reading consent cookie:', error);
    return null;
  }
};

/**
 * Write GDPR consent to cookie
 */
export const writeConsent = (consent: GdprConsent): void => {
  if (!isBrowser()) return;
  
  try {
    const value = encodeURIComponent(JSON.stringify(consent));
    const expires = new Date(Date.now() + GDPR_COOKIE_EXPIRY_MS).toUTCString();
    const domain = getCookieDomain();
    
    // Build cookie string
    let cookieString = `${GDPR_COOKIE_NAME}=${value}`;
    cookieString += `; expires=${expires}`;
    cookieString += '; path=/';
    
    // Only set domain for production (cross-subdomain)
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    
    // Security attributes
    if (window.location.protocol === 'https:') {
      cookieString += '; secure';
    }
    cookieString += '; samesite=lax';
    
    document.cookie = cookieString;
    
    console.info('[GDPR] Consent saved:', consent);
  } catch (error) {
    console.error('[GDPR] Error writing consent cookie:', error);
  }
};

/**
 * Clear GDPR consent cookie
 */
export const clearConsent = (): void => {
  if (!isBrowser()) return;
  
  try {
    const domain = getCookieDomain();
    
    // Clear with domain if on ds.com
    let cookieString = `${GDPR_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    document.cookie = cookieString;
    
    // Also try clearing without domain (for local dev)
    document.cookie = `${GDPR_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    
    console.info('[GDPR] Consent cleared');
  } catch (error) {
    console.error('[GDPR] Error clearing consent cookie:', error);
  }
};

/**
 * Create a consent object for "Accept All"
 */
export const createAcceptAllConsent = (): GdprConsent => ({
  accepted: true,
  timestamp: Date.now(),
  preferences: {
    analytics: true,
    marketing: true,
  },
});

/**
 * Create a consent object for "Reject All"
 */
export const createRejectAllConsent = (): GdprConsent => ({
  accepted: false,
  timestamp: Date.now(),
  preferences: {
    analytics: false,
    marketing: false,
  },
});

/**
 * Create a consent object with custom preferences
 */
export const createCustomConsent = (preferences: GdprPreferences): GdprConsent => ({
  accepted: preferences.analytics || preferences.marketing,
  timestamp: Date.now(),
  preferences,
});
