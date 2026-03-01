interface PlaceholderAdProps {
  /** Position of the ad slot */
  position: 'header' | 'footer';
  /** Height of the placeholder (default: 90px for leaderboard size) */
  height?: number;
  /** Custom label text */
  label?: string;
}

/**
 * PlaceholderAd - Visual placeholder for ad slots in demo mode
 * 
 * Displays a styled placeholder that shows developers where ads will appear.
 * Uses standard IAB leaderboard dimensions (728x90) by default.
 * 
 * @example
 * ```tsx
 * // In AdSlot when demo mode is enabled
 * <AdSlot position="header">
 *   <PlaceholderAd position="header" />
 * </AdSlot>
 * ```
 */
export function PlaceholderAd({ position, height = 90, label }: PlaceholderAdProps) {
  const displayLabel = label || `AD SLOT (${position.toUpperCase()})`;
  
  return (
    <div
      className="w-full flex items-center justify-center rounded-md border-2 border-dashed"
      style={{
        height: `${height}px`,
        maxWidth: '728px',
        margin: '0 auto',
        backgroundColor: position === 'header' 
          ? 'rgba(59, 130, 246, 0.1)' // Blue tint for header
          : 'rgba(34, 197, 94, 0.1)',  // Green tint for footer
        borderColor: position === 'header'
          ? 'rgba(59, 130, 246, 0.5)'
          : 'rgba(34, 197, 94, 0.5)',
      }}
      aria-label={`Demo advertisement - ${position}`}
    >
      <div className="text-center">
        <div 
          className="text-lg font-bold tracking-wide"
          style={{
            color: position === 'header'
              ? 'rgba(59, 130, 246, 0.8)'
              : 'rgba(34, 197, 94, 0.8)',
          }}
        >
          {displayLabel}
        </div>
        <div 
          className="text-xs mt-1"
          style={{
            color: position === 'header'
              ? 'rgba(59, 130, 246, 0.6)'
              : 'rgba(34, 197, 94, 0.6)',
          }}
        >
          728 × {height}px (Leaderboard)
        </div>
      </div>
    </div>
  );
}
