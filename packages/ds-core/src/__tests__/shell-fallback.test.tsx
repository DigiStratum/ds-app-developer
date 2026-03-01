/**
 * @digistratum/ds-core - Shell Fallback Components Tests
 * 
 * Tests FR-SHELL-001: Loading and error states handled gracefully
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ShellSkeleton,
  ShellErrorFallback,
  ShellErrorBoundary,
} from '../components/ShellFallback';

describe('ShellSkeleton', () => {
  it('should render loading skeleton with all sections by default', () => {
    render(<ShellSkeleton />);
    
    // Check for loading state
    const skeleton = document.querySelector('.ds-shell-skeleton');
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-label')).toBe('Loading application shell');
  });

  it('should hide header when showHeader is false', () => {
    const { container } = render(<ShellSkeleton showHeader={false} />);
    
    const header = container.querySelector('header');
    expect(header).toBeFalsy();
  });

  it('should hide footer when showFooter is false', () => {
    const { container } = render(<ShellSkeleton showFooter={false} />);
    
    const footer = container.querySelector('footer');
    expect(footer).toBeFalsy();
  });

  it('should hide content when showContent is false', () => {
    const { container } = render(<ShellSkeleton showContent={false} />);
    
    const main = container.querySelector('main');
    expect(main).toBeFalsy();
  });

  it('should apply custom className', () => {
    const { container } = render(<ShellSkeleton className="custom-class" />);
    
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });

  it('should include screen reader text', () => {
    render(<ShellSkeleton />);
    
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});

describe('ShellErrorFallback', () => {
  const testError = new Error('Test error message');

  it('should render error message', () => {
    render(<ShellErrorFallback error={testError} />);
    
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Unable to load application')).toBeTruthy();
  });

  it('should display custom title', () => {
    render(
      <ShellErrorFallback 
        error={testError} 
        title="Custom Error Title" 
      />
    );
    
    expect(screen.getByText('Custom Error Title')).toBeTruthy();
  });

  it('should display custom description', () => {
    render(
      <ShellErrorFallback 
        error={testError} 
        description="Custom error description" 
      />
    );
    
    expect(screen.getByText('Custom error description')).toBeTruthy();
  });

  it('should show error details in collapsible section', () => {
    render(<ShellErrorFallback error={testError} />);
    
    const details = screen.getByText('Technical details');
    expect(details).toBeTruthy();
    
    // Error message should be in details
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('should call onRetry when try again button clicked', () => {
    const onRetry = vi.fn();
    render(<ShellErrorFallback error={testError} onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should have refresh page button', () => {
    render(<ShellErrorFallback error={testError} />);
    
    expect(screen.getByText('Refresh page')).toBeTruthy();
  });

  it('should show offline hint', () => {
    render(<ShellErrorFallback error={testError} />);
    
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });
});

describe('ShellErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when no error', () => {
    render(
      <ShellErrorBoundary>
        <div data-testid="child">Child content</div>
      </ShellErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should catch errors and render fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ShellErrorBoundary>
        <ThrowError />
      </ShellErrorBoundary>
    );
    
    // Should render default error fallback
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('should render custom fallback element', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ShellErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ShellErrorBoundary>
    );
    
    expect(screen.getByText('Custom fallback')).toBeTruthy();
  });

  it('should render custom fallback function with error and retry', () => {
    const ThrowError = () => {
      throw new Error('Function error');
    };

    render(
      <ShellErrorBoundary 
        fallback={(error, retry) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      >
        <ThrowError />
      </ShellErrorBoundary>
    );
    
    expect(screen.getByText('Error: Function error')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();
    const ThrowError = () => {
      throw new Error('Callback error');
    };

    render(
      <ShellErrorBoundary onError={onError}>
        <ThrowError />
      </ShellErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalled();
  });
});
