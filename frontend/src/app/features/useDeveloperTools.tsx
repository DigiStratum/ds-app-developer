import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface DeveloperToolsContextValue {
  /** Whether ad demo mode is enabled */
  showAdDemo: boolean;
  /** Toggle ad demo mode on/off */
  toggleAdDemo: () => void;
  /** Whether custom header is enabled */
  showCustomHeader: boolean;
  /** Toggle custom header on/off */
  toggleCustomHeader: () => void;
  /** Whether viewport dimensions overlay is enabled */
  showDimensions: boolean;
  /** Toggle dimensions overlay on/off */
  toggleDimensions: () => void;
}

const DeveloperToolsContext = createContext<DeveloperToolsContextValue | null>(null);

const AD_DEMO_KEY = 'ds-ad-demo-enabled';
const CUSTOM_HEADER_KEY = 'ds-custom-header-enabled';
const DIMENSIONS_KEY = 'ds-dimensions-enabled';

/**
 * DeveloperToolsProvider - Provides developer tools state to the app
 * 
 * Features:
 * - Ad demo: visualize where ad slots appear
 * - Custom header: visualize app-specific header injection point
 * - Dimensions: show viewport width/height overlay
 * 
 * State is persisted to localStorage so it survives page refreshes.
 */
export function DeveloperToolsProvider({ children }: { children: ReactNode }) {
  const [showAdDemo, setShowAdDemo] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AD_DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showCustomHeader, setShowCustomHeader] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CUSTOM_HEADER_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showDimensions, setShowDimensions] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DIMENSIONS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(AD_DEMO_KEY, String(showAdDemo));
    } catch {
      // Ignore storage errors
    }
  }, [showAdDemo]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_HEADER_KEY, String(showCustomHeader));
    } catch {
      // Ignore storage errors
    }
  }, [showCustomHeader]);

  useEffect(() => {
    try {
      localStorage.setItem(DIMENSIONS_KEY, String(showDimensions));
    } catch {
      // Ignore storage errors
    }
  }, [showDimensions]);

  const toggleAdDemo = useCallback(() => {
    setShowAdDemo(prev => !prev);
  }, []);

  const toggleCustomHeader = useCallback(() => {
    setShowCustomHeader(prev => !prev);
  }, []);

  const toggleDimensions = useCallback(() => {
    setShowDimensions(prev => !prev);
  }, []);

  const value: DeveloperToolsContextValue = {
    showAdDemo,
    toggleAdDemo,
    showCustomHeader,
    toggleCustomHeader,
    showDimensions,
    toggleDimensions,
  };

  return (
    <DeveloperToolsContext.Provider value={value}>
      {children}
    </DeveloperToolsContext.Provider>
  );
}

/**
 * Hook to access developer tools state
 */
export function useDeveloperTools(): DeveloperToolsContextValue {
  const context = useContext(DeveloperToolsContext);
  if (!context) {
    throw new Error('useDeveloperTools must be used within DeveloperToolsProvider');
  }
  return context;
}

/**
 * Safe version that returns default values if not in provider
 */
export function useDeveloperToolsSafe(): DeveloperToolsContextValue {
  const context = useContext(DeveloperToolsContext);
  if (!context) {
    return {
      showAdDemo: false,
      toggleAdDemo: () => {},
      showCustomHeader: false,
      toggleCustomHeader: () => {},
      showDimensions: false,
      toggleDimensions: () => {},
    };
  }
  return context;
}
