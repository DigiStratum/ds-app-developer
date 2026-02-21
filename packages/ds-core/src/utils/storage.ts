/**
 * @digistratum/ds-core - Storage Utilities
 * 
 * Safe localStorage/sessionStorage wrappers with SSR support.
 */

/**
 * Safe localStorage wrapper that handles SSR and errors
 */
export const storage = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (quota, etc.)
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

/**
 * Safe sessionStorage wrapper that handles SSR and errors
 */
export const sessionStore = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },

  /**
   * Get and parse JSON from sessionStorage
   */
  getJSON<T>(key: string): T | null {
    const value = sessionStore.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  /**
   * Store JSON in sessionStorage
   */
  setJSON<T>(key: string, value: T): void {
    try {
      sessionStore.set(key, JSON.stringify(value));
    } catch {
      // Ignore serialization errors
    }
  },
};
