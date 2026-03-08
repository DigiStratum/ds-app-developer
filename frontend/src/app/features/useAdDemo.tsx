import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AdDemoContextValue {
  /** Whether ad demo mode is enabled */
  showAdDemo: boolean;
  /** Toggle ad demo mode on/off */
  toggleAdDemo: () => void;
  /** Set ad demo mode explicitly */
  setShowAdDemo: (show: boolean) => void;
}

const AdDemoContext = createContext<AdDemoContextValue | null>(null);

const STORAGE_KEY = 'ds-ad-demo-enabled';

/**
 * AdDemoProvider - Provides ad demo toggle state to the app
 * 
 * The ad demo feature allows developers to visualize where ad slots
 * will appear in the layout by showing placeholder graphics.
 * 
 * State is persisted to localStorage so it survives page refreshes.
 * Default state: false (ads hidden)
 * 
 * @example
 * ```tsx
 * // In App.tsx
 * <AdDemoProvider>
 *   <AppRoutes />
 * </AdDemoProvider>
 * 
 * // In a component
 * const { showAdDemo, toggleAdDemo } = useAdDemo();
 * ```
 */
export function AdDemoProvider({ children }: { children: ReactNode }) {
  const [showAdDemo, setShowAdDemoState] = useState<boolean>(() => {
    // Initialize from localStorage if available
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(showAdDemo));
    } catch {
      // Ignore storage errors
    }
  }, [showAdDemo]);

  const toggleAdDemo = useCallback(() => {
    setShowAdDemoState(prev => !prev);
  }, []);

  const setShowAdDemo = useCallback((show: boolean) => {
    setShowAdDemoState(show);
  }, []);

  const value: AdDemoContextValue = {
    showAdDemo,
    toggleAdDemo,
    setShowAdDemo,
  };

  return (
    <AdDemoContext.Provider value={value}>
      {children}
    </AdDemoContext.Provider>
  );
}

/**
 * Hook to access ad demo state
 * 
 * @returns Ad demo state and toggle function
 * @throws Error if used outside AdDemoProvider
 * 
 * @example
 * ```tsx
 * const { showAdDemo, toggleAdDemo } = useAdDemo();
 * 
 * // In a toggle button
 * <button onClick={toggleAdDemo}>
 *   {showAdDemo ? 'Hide Ads' : 'Show Ads'}
 * </button>
 * 
 * // Conditional rendering
 * {showAdDemo && <PlaceholderAd />}
 * ```
 */
export function useAdDemo(): AdDemoContextValue {
  const context = useContext(AdDemoContext);
  if (!context) {
    throw new Error('useAdDemo must be used within AdDemoProvider');
  }
  return context;
}

/**
 * Safe version of useAdDemo that returns default values if not in provider
 * Useful for components that may be used outside the provider
 */
export function useAdDemoSafe(): AdDemoContextValue {
  const context = useContext(AdDemoContext);
  if (!context) {
    return {
      showAdDemo: false,
      toggleAdDemo: () => {},
      setShowAdDemo: () => {},
    };
  }
  return context;
}
