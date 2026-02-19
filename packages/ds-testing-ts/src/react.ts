/**
 * React Testing Utilities
 *
 * Wrappers and helpers for React Testing Library
 */

import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import React, { type ReactElement, type ReactNode } from 'react';

/**
 * Provider wrapper configuration
 */
export interface ProviderConfig {
  router?: {
    initialEntries?: string[];
    initialIndex?: number;
  };
  theme?: 'light' | 'dark';
  locale?: string;
}

/**
 * Create a wrapper with common providers
 */
export function createWrapper(config: ProviderConfig = {}): React.FC<{ children: ReactNode }> {
  // This is a template - actual implementation depends on your app's providers
  return function Wrapper({ children }: { children: ReactNode }) {
    // You would wrap with your actual providers here:
    // <ThemeProvider theme={config.theme}>
    //   <I18nProvider locale={config.locale}>
    //     <MemoryRouter initialEntries={config.router?.initialEntries}>
    //       {children}
    //     </MemoryRouter>
    //   </I18nProvider>
    // </ThemeProvider>
    return React.createElement(React.Fragment, null, children);
  };
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & { providerConfig?: ProviderConfig } = {}
): RenderResult {
  const { providerConfig = {}, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: createWrapper(providerConfig),
    ...renderOptions,
  });
}

/**
 * Render with router
 */
export function renderWithRouter(
  ui: ReactElement,
  options: RenderOptions & {
    initialEntries?: string[];
    initialIndex?: number;
  } = {}
): RenderResult {
  const { initialEntries = ['/'], initialIndex, ...renderOptions } = options;
  
  return renderWithProviders(ui, {
    providerConfig: {
      router: { initialEntries, initialIndex },
    },
    ...renderOptions,
  });
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(container: Element): Promise<void> {
  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    '[data-testid="loading"]',
    '[aria-busy="true"]',
    '.loading',
    '.spinner',
  ];

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      const hasLoading = loadingSelectors.some(
        selector => container.querySelector(selector)
      );
      if (!hasLoading) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    // Initial check
    const hasLoading = loadingSelectors.some(
      selector => container.querySelector(selector)
    );
    if (!hasLoading) {
      observer.disconnect();
      resolve();
    }
  });
}

/**
 * Mock ResizeObserver for tests
 */
export function mockResizeObserver(): void {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * Mock IntersectionObserver for tests
 */
export function mockIntersectionObserver(): void {
  global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
}

/**
 * Mock matchMedia for tests
 */
export function mockMatchMedia(matches = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

/**
 * Setup all common mocks for React tests
 */
export function setupReactTestMocks(): void {
  mockResizeObserver();
  mockIntersectionObserver();
  mockMatchMedia();
}

// Re-export testing-library utilities
export {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  cleanup,
} from '@testing-library/react';

export { default as userEvent } from '@testing-library/user-event';
