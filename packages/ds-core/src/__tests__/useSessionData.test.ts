/**
 * Tests for useSessionData hook
 * 
 * Tests FR-SESSION-001: Frontend access to session data via useSessionData hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionData } from '../hooks/useSessionData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSessionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial load', () => {
    // Tests FR-SESSION-001: Hook loads session data on mount
    it('loads session data on mount', async () => {
      const mockSessionResponse = {
        session: {
          id: 'sess_123',
          userId: 'user_456',
          expiresAt: '2026-03-06T00:00:00Z',
          lastActivityAt: '2026-03-05T12:00:00Z',
        },
        data: { foo: 'bar', count: 42 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionResponse),
      });

      const { result } = renderHook(() => useSessionData<{ foo: string; count: number }>());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSessionResponse.session);
      expect(result.current.data).toEqual(mockSessionResponse.data);
      expect(result.current.error).toBeNull();
    });

    // Tests FR-SESSION-001: Hook handles API errors gracefully
    it('handles fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
      });

      const { result } = renderHook(() => useSessionData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.session).toBeNull();
      expect(result.current.data).toEqual({});
    });

    // Tests FR-SESSION-001: Hook handles network failures
    it('handles network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSessionData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('get(key)', () => {
    // Tests FR-SESSION-001: get() retrieves specific key from session data
    it('retrieves a specific key from session data', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'dark', lastPage: '/dashboard' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionResponse),
      });

      const { result } = renderHook(() => useSessionData<{ theme: string; lastPage: string }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.get('theme')).toBe('dark');
      expect(result.current.get('lastPage')).toBe('/dashboard');
      expect(result.current.get('nonExistent')).toBeUndefined();
    });
  });

  describe('set(key, value)', () => {
    // Tests FR-SESSION-001: set() updates a single key in session data
    it('sets a single key in session data', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'light' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockSessionResponse, data: { theme: 'dark' } }),
        });

      const { result } = renderHook(() => useSessionData<{ theme: string }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.set('theme', 'dark');
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/session/data',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ theme: 'dark' }),
        })
      );
    });
  });

  describe('merge(partial)', () => {
    // Tests FR-SESSION-001: merge() updates multiple keys at once
    it('merges partial data into session data', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'light', lang: 'en' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockSessionResponse,
            data: { theme: 'dark', lang: 'es' },
          }),
        });

      const { result } = renderHook(() => useSessionData<{ theme: string; lang: string }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.merge({ theme: 'dark', lang: 'es' });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/session/data',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ theme: 'dark', lang: 'es' }),
        })
      );
    });
  });

  describe('remove(key)', () => {
    // Tests FR-SESSION-001: remove() deletes a specific key from session data
    it('removes a specific key from session data', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'dark', temp: 'value' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockSessionResponse,
            data: { theme: 'dark' },
          }),
        });

      const { result } = renderHook(() => useSessionData<{ theme: string; temp?: string }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.remove('temp');
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/session/data/temp',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('clear()', () => {
    // Tests FR-SESSION-001: clear() removes all session data
    it('clears all session data', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'dark', lang: 'es' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockSessionResponse,
            data: {},
          }),
        });

      const { result } = renderHook(() => useSessionData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clear();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/session/data',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('optimistic updates', () => {
    // Tests FR-SESSION-001: set() applies optimistic update before server confirms
    it('applies optimistic updates on set()', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'light' },
      };

      // Use a promise we control to delay the response
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse),
        })
        .mockImplementationOnce(() => updatePromise);

      const { result } = renderHook(() => useSessionData<{ theme: string }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start the set operation
      act(() => {
        result.current.set('theme', 'dark');
      });

      // Data should be updated optimistically BEFORE the server responds
      expect(result.current.data?.theme).toBe('dark');

      // Resolve the server response
      resolveUpdate!({
        ok: true,
        json: () => Promise.resolve({ ...mockSessionResponse, data: { theme: 'dark' } }),
      });
    });

    // Tests FR-SESSION-001: merge() applies optimistic update before server confirms
    it('applies optimistic updates on merge()', async () => {
      const mockSessionResponse = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { theme: 'light', lang: 'en' },
      };

      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse),
        })
        .mockImplementationOnce(() => updatePromise);

      const { result } = renderHook(() => useSessionData<{ theme: string; lang: string }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.merge({ theme: 'dark' });
      });

      // Optimistically updated
      expect(result.current.data?.theme).toBe('dark');
      expect(result.current.data?.lang).toBe('en'); // Preserved

      resolveUpdate!({
        ok: true,
        json: () => Promise.resolve({ ...mockSessionResponse, data: { theme: 'dark', lang: 'en' } }),
      });
    });
  });

  describe('session read-only', () => {
    // Tests FR-SESSION-001: session object is read-only
    it('exposes session as read-only', async () => {
      const mockSessionResponse = {
        session: {
          id: 'sess_123',
          userId: 'user_456',
          expiresAt: '2026-03-06T00:00:00Z',
          lastActivityAt: '2026-03-05T12:00:00Z',
        },
        data: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionResponse),
      });

      const { result } = renderHook(() => useSessionData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Session should have the expected shape
      expect(result.current.session?.id).toBe('sess_123');
      expect(result.current.session?.userId).toBe('user_456');
      expect(result.current.session?.expiresAt).toBe('2026-03-06T00:00:00Z');
      expect(result.current.session?.lastActivityAt).toBe('2026-03-05T12:00:00Z');
    });
  });

  describe('refresh()', () => {
    // Tests FR-SESSION-001: refresh() reloads session data from server
    it('reloads session data from server', async () => {
      const mockSessionResponse1 = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { version: 1 },
      };

      const mockSessionResponse2 = {
        session: { id: 'sess_123', userId: 'user_456', expiresAt: null, lastActivityAt: null },
        data: { version: 2 },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse2),
        });

      const { result } = renderHook(() => useSessionData<{ version: number }>());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.version).toBe(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data?.version).toBe(2);
    });
  });
});
