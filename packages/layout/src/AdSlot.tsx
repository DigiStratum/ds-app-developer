import { ReactNode } from 'react';

export interface AdSlotProps {
  position: 'header' | 'footer';
  className?: string;
  children?: ReactNode;
}

/**
 * AdSlot - Placeholder for horizontal ad zones
 * Renders between header/content and content/footer.
 * 
 * When children are provided, renders them inside the slot.
 * When empty, renders nothing (no visual space taken).
 */
export function AdSlot({ position, className = '', children }: AdSlotProps) {
  // If no children, don't render anything
  if (!children) {
    return null;
  }

  return (
    <div 
      className={`w-full flex items-center justify-center ${className}`}
      style={{ 
        backgroundColor: 'var(--ds-bg-margin, #f3f4f6)',
        minHeight: 'auto',
        padding: '0',
      }}
      data-ad-slot={position}
      aria-label={`Advertisement slot - ${position}`}
    >
      <div className="max-w-7xl w-full mx-auto">
        {children}
      </div>
    </div>
  );
}
