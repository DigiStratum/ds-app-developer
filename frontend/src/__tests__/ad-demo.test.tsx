/**
 * Tests for Ad Demo Toggle feature (#932)
 * 
 * Tests FR-ADDEMO-001: Ad slot demo toggle for developer testing
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdDemoProvider, useAdDemo } from '../hooks/useAdDemo';
import { AdDemoToggle } from '../components/AdDemoToggle';
import { PlaceholderAd } from '../components/PlaceholderAd';

// Test component to access hook values
function TestConsumer() {
  const { showAdDemo, toggleAdDemo } = useAdDemo();
  return (
    <div>
      <span data-testid="state">{showAdDemo ? 'on' : 'off'}</span>
      <button onClick={toggleAdDemo}>toggle</button>
    </div>
  );
}

describe('Ad Demo Feature (#932)', () => {
  describe('useAdDemo hook', () => {
    it('defaults to false (ads hidden)', () => {
      render(
        <AdDemoProvider>
          <TestConsumer />
        </AdDemoProvider>
      );
      expect(screen.getByTestId('state').textContent).toBe('off');
    });

    it('toggles state when toggle is called', () => {
      render(
        <AdDemoProvider>
          <TestConsumer />
        </AdDemoProvider>
      );
      
      expect(screen.getByTestId('state').textContent).toBe('off');
      
      fireEvent.click(screen.getByText('toggle'));
      expect(screen.getByTestId('state').textContent).toBe('on');
      
      fireEvent.click(screen.getByText('toggle'));
      expect(screen.getByTestId('state').textContent).toBe('off');
    });
  });

  describe('AdDemoToggle component', () => {
    it('renders toggle button with correct initial state', () => {
      render(
        <AdDemoProvider>
          <AdDemoToggle />
        </AdDemoProvider>
      );
      
      const button = screen.getByRole('button', { name: /show ad slot placeholders/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Ads OFF');
    });

    it('toggles state when clicked', () => {
      render(
        <AdDemoProvider>
          <AdDemoToggle />
        </AdDemoProvider>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Ads OFF');
      
      fireEvent.click(button);
      expect(button).toHaveTextContent('Ads ON');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('PlaceholderAd component', () => {
    it('renders header placeholder with correct styling', () => {
      render(<PlaceholderAd position="header" />);
      
      expect(screen.getByText('AD SLOT (HEADER)')).toBeInTheDocument();
      expect(screen.getByText(/728 × 90px/)).toBeInTheDocument();
    });

    it('renders footer placeholder with correct styling', () => {
      render(<PlaceholderAd position="footer" />);
      
      expect(screen.getByText('AD SLOT (FOOTER)')).toBeInTheDocument();
    });

    it('supports custom height', () => {
      render(<PlaceholderAd position="header" height={120} />);
      
      expect(screen.getByText(/728 × 120px/)).toBeInTheDocument();
    });

    it('supports custom label', () => {
      render(<PlaceholderAd position="header" label="Custom Ad" />);
      
      expect(screen.getByText('Custom Ad')).toBeInTheDocument();
    });
  });
});
