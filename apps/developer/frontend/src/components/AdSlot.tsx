interface AdSlotProps {
  position: 'header' | 'footer';
}

/**
 * AdSlot component - placeholder for horizontal ad zones
 * Renders between header/content and content/footer as light gray margin zones.
 * 
 * @param position - 'header' (above content) or 'footer' (below content)
 */
export function AdSlot({ position }: AdSlotProps) {
  return (
    <div 
      className="w-full flex items-center justify-center"
      style={{ 
        backgroundColor: 'var(--ds-bg-margin)',
        minHeight: '24px',
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
