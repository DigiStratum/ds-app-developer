/**
 * PlaceholderCustomHeader - Visual placeholder for custom header injection point
 * 
 * Shows developers where app-specific custom header content will appear.
 * This sits ABOVE the main AppShell header.
 */
export function PlaceholderCustomHeader() {
  return (
    <div
      className="w-full flex items-center justify-center rounded-b-lg border-2 border-dashed"
      style={{
        height: '48px',
        backgroundColor: 'rgba(147, 51, 234, 0.1)', // Purple tint
        borderColor: 'rgba(147, 51, 234, 0.5)',
        borderTopWidth: 0,
      }}
      aria-label="Demo custom header zone"
    >
      <div className="text-center">
        <div 
          className="text-sm font-bold tracking-wide"
          style={{ color: 'rgba(147, 51, 234, 0.8)' }}
        >
          CUSTOM HEADER ZONE
        </div>
      </div>
    </div>
  );
}
