/**
 * @digistratum/ds-core - usePrefs Hook
 * 
 * Unified user preferences hook storing all preferences in a single ds-prefs cookie.
 * Uses cookies with domain=.digistratum.com for cross-subdomain sharing.
 */

import { useCallback, useSyncExternalStore } from 'react';

// Cookie configuration
const COOKIE_NAME = 'ds-prefs';
const COOKIE_DOMAIN = '.digistratum.com';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];
export type ThemeMode = 'light' | 'dark' | 'system';
export type ConsentLevel = 'all' | 'essential' | null;

export interface UserPrefs {
  lang: LanguageCode;
  theme: ThemeMode;
  consent: ConsentLevel;
}

const DEFAULT_PREFS: UserPrefs = {
  lang: 'en',
  theme: 'system',
  consent: null,
};

// External store for cross-component reactivity
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(): void {
  listeners.forEach((callback) => callback());
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

function encodePrefs(prefs: UserPrefs): string {
  const consent = prefs.consent ?? '-';
  return btoa(`${prefs.lang}|${prefs.theme}|${consent}`);
}

function decodePrefs(encoded: string): UserPrefs | null {
  try {
    const decoded = atob(encoded);
    const parts = decoded.split('|');
    if (parts.length !== 3) return null;
    
    const [lang, theme, consent] = parts;
    const validLangs = SUPPORTED_LANGUAGES.map(l => l.code);
    const validThemes: ThemeMode[] = ['light', 'dark', 'system'];
    const validConsent: (string | null)[] = ['all', 'essential', '-'];
    
    if (!validLangs.includes(lang as LanguageCode)) return null;
    if (!validThemes.includes(theme as ThemeMode)) return null;
    if (!validConsent.includes(consent)) return null;
    
    return {
      lang: lang as LanguageCode,
      theme: theme as ThemeMode,
      consent: consent === '-' ? null : consent as ConsentLevel,
    };
  } catch {
    return null;
  }
}

function getPrefsFromCookie(): UserPrefs {
  const encoded = getCookie(COOKIE_NAME);
  if (!encoded) return { ...DEFAULT_PREFS };
  const prefs = decodePrefs(encoded);
  return prefs ?? { ...DEFAULT_PREFS };
}

function savePrefs(prefs: UserPrefs): void {
  const encoded = encodePrefs(prefs);
  setCookie(COOKIE_NAME, encoded, COOKIE_MAX_AGE);
  notifyListeners();
}

let cachedPrefs: UserPrefs | null = null;

function getSnapshot(): UserPrefs {
  const prefs = getPrefsFromCookie();
  if (!cachedPrefs || 
      cachedPrefs.lang !== prefs.lang || 
      cachedPrefs.theme !== prefs.theme || 
      cachedPrefs.consent !== prefs.consent) {
    cachedPrefs = prefs;
  }
  return cachedPrefs;
}

function getServerSnapshot(): UserPrefs {
  return { ...DEFAULT_PREFS };
}

export interface UsePrefsReturn {
  prefs: UserPrefs;
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  getLangInfo: (code: LanguageCode) => typeof SUPPORTED_LANGUAGES[number] | undefined;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
  consent: ConsentLevel;
  hasConsented: boolean;
  hasFullConsent: boolean;
  setConsent: (level: 'all' | 'essential') => void;
  clearConsent: () => void;
  resetPrefs: () => void;
}

/**
 * Hook to manage unified user preferences
 */
export function usePrefs(): UsePrefsReturn {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  const setLang = useCallback((lang: LanguageCode) => {
    const current = getPrefsFromCookie();
    savePrefs({ ...current, lang });
  }, []);
  
  const getLangInfo = useCallback((code: LanguageCode) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code);
  }, []);
  
  const setTheme = useCallback((theme: ThemeMode) => {
    const current = getPrefsFromCookie();
    savePrefs({ ...current, theme });
  }, []);
  
  const cycleTheme = useCallback(() => {
    const themes: ThemeMode[] = ['light', 'dark', 'system'];
    const current = getPrefsFromCookie();
    const currentIndex = themes.indexOf(current.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    savePrefs({ ...current, theme: themes[nextIndex] });
  }, []);
  
  const setConsent = useCallback((level: 'all' | 'essential') => {
    const current = getPrefsFromCookie();
    savePrefs({ ...current, consent: level });
  }, []);
  
  const clearConsent = useCallback(() => {
    const current = getPrefsFromCookie();
    savePrefs({ ...current, consent: null });
  }, []);
  
  const resetPrefs = useCallback(() => {
    savePrefs({ ...DEFAULT_PREFS });
  }, []);
  
  return {
    prefs,
    lang: prefs.lang,
    setLang,
    getLangInfo,
    theme: prefs.theme,
    setTheme,
    cycleTheme,
    consent: prefs.consent,
    hasConsented: prefs.consent !== null,
    hasFullConsent: prefs.consent === 'all',
    setConsent,
    clearConsent,
    resetPrefs,
  };
}

export function getPrefs(): UserPrefs {
  return getPrefsFromCookie();
}

export function updatePrefs(updates: Partial<UserPrefs>): void {
  const current = getPrefsFromCookie();
  savePrefs({ ...current, ...updates });
}
