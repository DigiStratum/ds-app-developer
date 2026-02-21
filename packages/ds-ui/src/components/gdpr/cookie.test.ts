/**
 * Tests for GDPR cookie utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readConsent,
  writeConsent,
  clearConsent,
  createAcceptAllConsent,
  createRejectAllConsent,
  createCustomConsent,
  GDPR_COOKIE_NAME,
} from './cookie';
import type { GdprConsent } from './types';

// Mock document.cookie
let mockCookies: string[] = [];

const mockDocument = {
  get cookie() {
    return mockCookies.join('; ');
  },
  set cookie(value: string) {
    // Handle clearing (expiry in the past)
    if (value.includes('expires=Thu, 01 Jan 1970')) {
      const name = value.split('=')[0];
      mockCookies = mockCookies.filter(c => !c.startsWith(name + '='));
      return;
    }
    
    // Extract cookie name and value (before semicolons for attributes)
    const nameValue = value.split(';')[0];
    const name = nameValue.split('=')[0];
    
    // Replace existing or add new
    const existingIndex = mockCookies.findIndex(c => c.startsWith(name + '='));
    if (existingIndex >= 0) {
      mockCookies[existingIndex] = nameValue;
    } else {
      mockCookies.push(nameValue);
    }
  },
};

describe('GDPR Cookie Utils', () => {
  beforeEach(() => {
    mockCookies = [];
    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', { location: { hostname: 'localhost', protocol: 'https:' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('readConsent', () => {
    it('returns null when no cookie exists', () => {
      expect(readConsent()).toBeNull();
    });

    it('reads valid consent from cookie', () => {
      const consent: GdprConsent = {
        accepted: true,
        timestamp: Date.now(),
        preferences: { analytics: true, marketing: false },
      };
      mockCookies = [`${GDPR_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}`];
      
      const result = readConsent();
      expect(result).toEqual(consent);
    });

    it('returns null for invalid JSON', () => {
      mockCookies = [`${GDPR_COOKIE_NAME}=invalid-json`];
      expect(readConsent()).toBeNull();
    });

    it('returns null for expired consent', () => {
      const consent: GdprConsent = {
        accepted: true,
        timestamp: Date.now() - (366 * 24 * 60 * 60 * 1000), // Over 1 year ago
        preferences: { analytics: true, marketing: true },
      };
      mockCookies = [`${GDPR_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}`];
      
      expect(readConsent()).toBeNull();
    });
  });

  describe('writeConsent', () => {
    it('writes consent to cookie', () => {
      const consent = createAcceptAllConsent();
      writeConsent(consent);
      
      expect(mockCookies.length).toBe(1);
      expect(mockCookies[0]).toContain(GDPR_COOKIE_NAME);
    });
  });

  describe('clearConsent', () => {
    it('removes consent cookie', () => {
      const consent = createAcceptAllConsent();
      writeConsent(consent);
      expect(mockCookies.length).toBe(1);
      
      clearConsent();
      expect(mockCookies.length).toBe(0);
    });
  });

  describe('consent factories', () => {
    it('createAcceptAllConsent creates proper consent', () => {
      const consent = createAcceptAllConsent();
      expect(consent.accepted).toBe(true);
      expect(consent.preferences?.analytics).toBe(true);
      expect(consent.preferences?.marketing).toBe(true);
      expect(consent.timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('createRejectAllConsent creates proper consent', () => {
      const consent = createRejectAllConsent();
      expect(consent.accepted).toBe(false);
      expect(consent.preferences?.analytics).toBe(false);
      expect(consent.preferences?.marketing).toBe(false);
    });

    it('createCustomConsent creates consent with custom prefs', () => {
      const consent = createCustomConsent({ analytics: true, marketing: false });
      expect(consent.accepted).toBe(true); // accepted because analytics is true
      expect(consent.preferences?.analytics).toBe(true);
      expect(consent.preferences?.marketing).toBe(false);
    });

    it('createCustomConsent with all false sets accepted to false', () => {
      const consent = createCustomConsent({ analytics: false, marketing: false });
      expect(consent.accepted).toBe(false);
    });
  });
});
