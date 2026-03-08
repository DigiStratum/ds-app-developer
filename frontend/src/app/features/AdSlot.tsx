import { ReactNode } from 'react';

interface AdSlotProps {
  position: 'header' | 'footer';
  children?: ReactNode;
}

/**
 * AdSlot component - placeholder for horizontal ad zones
 * Renders between header/content and content/footer.
 * 
 * When empty (no children), the slot occupies 0px height to prevent
 * excessive spacing between layout containers.
 * When ads are injected, expands to accommodate content.
 * 
 * @param position - 'header' (above content) or 'footer' (below content)
 * @param children - Ad content to render (optional)
 */
export function AdSlot({ position, children }: AdSlotProps) {
  // When empty, render nothing to avoid spacing issues
  if (!children) {
    return (
      <div 
        data-ad-slot={position}
        aria-hidden="true"
        style={{ height: 0, overflow: 'hidden' }}
      />
    );
  }

  return (
    <div 
      className="w-full flex items-center justify-center"
      style={{ 
        backgroundColor: 'var(--ds-bg-margin)',
        padding: '8px 0',
      }}
      data-ad-slot={position}
      aria-label={`Advertisement slot - ${position}`}
    >
      {/* Centered container for ad content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
