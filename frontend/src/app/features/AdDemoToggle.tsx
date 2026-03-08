import { useAdDemoSafe } from './useAdDemo';

/**
 * AdDemoToggle - Toggle button for ad demo mode
 * 
 * A compact toggle button that shows/hides ad slot placeholders.
 * Uses useAdDemoSafe so it can be used outside the provider (no-op in that case).
 * 
 * Designed to be placed in the footer or a dev tools panel.
 * 
 * @example
 * ```tsx
 * // In footer
 * <AdDemoToggle />
 * 
 * // With custom styling
 * <AdDemoToggle className="ml-4" />
 * ```
 */
export function AdDemoToggle({ className = '' }: { className?: string }) {
  const { showAdDemo, toggleAdDemo } = useAdDemoSafe();

  return (
    <button
      onClick={toggleAdDemo}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded
        transition-colors duration-150
        ${showAdDemo 
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700' 
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
        }
        hover:bg-blue-200 dark:hover:bg-blue-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${className}
      `}
      aria-pressed={showAdDemo}
      aria-label={showAdDemo ? 'Hide ad slot placeholders' : 'Show ad slot placeholders'}
      title={showAdDemo ? 'Hide ad placeholders' : 'Show ad placeholders'}
    >
      {/* Ad icon */}
      <svg 
        className="w-3.5 h-3.5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
        <path strokeWidth="2" d="M7 8h4v4H7zM13 8h4M13 12h4M7 16h10" />
      </svg>
      <span>Ads {showAdDemo ? 'ON' : 'OFF'}</span>
    </button>
  );
}
