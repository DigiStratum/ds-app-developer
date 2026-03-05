/**
 * @digistratum/ds-core - usePrefs Hook
 * 
 * Unified preferences management with single ds-prefs cookie.
 * Stores: language | theme | consent in base64-encoded format.
 */

import { useCallback, useSyncExternalStore } from 'react';

const COOKIE_NAME = 'ds-prefs';
const COOKIE_DOMAIN = '.digistratum.com';

// Supported languages (Google Translate common subset)
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska' },
  { code: 'cs', label: 'Czech', nativeLabel: 'Čeština' },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu' },
  { code: 'fil', label: 'Filipino', nativeLabel: 'Filipino' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar' },
  { code: 'ro', label: 'Romanian', nativeLabel: 'Română' },
  { code: 'da', label: 'Danish', nativeLabel: 'Dansk' },
] as const;

export type LanguageCode = string;
export type ThemeMode = 'light' | 'dark';
export type ConsentLevel = 'all' | 'essential' | null;

export interface UserPrefs {
  lang: string;
  theme: ThemeMode;
  consent: ConsentLevel;
}

const DEFAULT_PREFS: UserPrefs = {
  lang: 'en',
  theme: 'light',
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

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=/; SameSite=Lax; Secure`;
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
    const validThemes: ThemeMode[] = ['light', 'dark'];
    const validConsent: (string | null)[] = ['all', 'essential', '-'];
    
    if (!validThemes.includes(theme as ThemeMode)) return null;
    if (!validConsent.includes(consent)) return null;
    
    return {
      lang: lang || 'en',
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
  
  const decoded = decodePrefs(encoded);
  return decoded ?? { ...DEFAULT_PREFS };
}

function savePrefs(prefs: UserPrefs): void {
  const encoded = encodePrefs(prefs);
  setCookie(COOKIE_NAME, encoded);
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

/**
 * Unified preferences hook
 * 
 * Manages language, theme, and consent in a single ds-prefs cookie.
 */
export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  const setLang = useCallback((lang: string) => {
    const current = getPrefsFromCookie();
    savePrefs({ ...current, lang });
  }, []);
  
  const getLangInfo = useCallback((code: string) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code);
  }, []);
  
  const setTheme = useCallback((theme: ThemeMode) => {
    const current = getPrefsFromCookie();
    savePrefs({ ...current, theme });
    // Apply to document
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, []);
  
  const toggleTheme = useCallback(() => {
    const current = getPrefsFromCookie();
    const newTheme = current.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [setTheme]);
  
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
    toggleTheme,
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
