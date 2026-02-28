/**
 * @digistratum/ds-core - AdSlot Component
 * 
 * Placeholder for horizontal ad zones.
 * Renders between header/content and content/footer.
 */

export interface AdSlotProps {
  /** Position identifier */
  position: 'header' | 'footer' | string;
  /** Minimum height in pixels (default: 24) */
  minHeight?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * AdSlot component - placeholder for horizontal ad zones.
 * Renders between header/content and content/footer as light gray margin zones.
 * 
 * @example
 * ```tsx
 * <AdSlot position="header" />
 * <MainContent />
 * <AdSlot position="footer" />
 * ```
 */
export function AdSlot({
  position,
  minHeight = 24,
  className = '',
}: AdSlotProps) {
  return (
    <div
      className={`w-full flex items-center justify-center ${className}`}
      style={{
        backgroundColor: 'var(--ds-bg-margin)',
        minHeight: `${minHeight}px`,
        padding: '8px 0',
      }}
      data-ad-slot={position}
      aria-label={`Advertisement slot - ${position}`}
    >
      {/* Centered container for future ad injection */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Ad content will be injected here */}
      </div>
    </div>
  );
}
