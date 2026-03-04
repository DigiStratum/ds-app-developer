import type { AdSlotProps } from './types';

/**
 * AdSlot - Placeholder for horizontal ad zones
 * Renders between header/content and content/footer.
 */
export function AdSlot({ position, className = '' }: AdSlotProps) {
  return (
    <div 
      className={`w-full flex items-center justify-center ${className}`}
      style={{ 
        backgroundColor: 'var(--ds-bg-margin, #f3f4f6)',
        minHeight: '24px',
        padding: '8px 0',
      }}
      data-ad-slot={position}
      aria-label={`Advertisement slot - ${position}`}
    >
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Ad content will be injected here */}
      </div>
    </div>
  );
}
