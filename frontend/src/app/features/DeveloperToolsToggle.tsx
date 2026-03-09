import { useDeveloperToolsSafe } from './useDeveloperTools';

/**
 * DeveloperToolsToggle - Toggle buttons for developer visualization tools
 * 
 * Shows compact toggles for:
 * - Ad slots: shows/hides ad slot placeholders
 * - Custom header: shows/hides custom header placeholder
 * - Dimensions: shows/hides viewport dimensions overlay
 */
export function DeveloperToolsToggle({ className = '' }: { className?: string }) {
  const { 
    showAdDemo, toggleAdDemo, 
    showCustomHeader, toggleCustomHeader,
    showDimensions, toggleDimensions,
  } = useDeveloperToolsSafe();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Ad Demo Toggle */}
      <button
        onClick={toggleAdDemo}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded
          transition-colors duration-150 w-full
          ${showAdDemo 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
          }
          hover:bg-blue-200 dark:hover:bg-blue-800
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
        aria-pressed={showAdDemo}
        title={showAdDemo ? 'Hide ad placeholders' : 'Show ad placeholders'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
          <path strokeWidth="2" d="M7 8h4v4H7zM13 8h4M13 12h4M7 16h10" />
        </svg>
        <span>Ads {showAdDemo ? 'ON' : 'OFF'}</span>
      </button>

      {/* Custom Header Toggle */}
      <button
        onClick={toggleCustomHeader}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded
          transition-colors duration-150 w-full
          ${showCustomHeader 
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
          }
          hover:bg-purple-200 dark:hover:bg-purple-800
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
        `}
        aria-pressed={showCustomHeader}
        title={showCustomHeader ? 'Hide custom header' : 'Show custom header'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="6" rx="1" strokeWidth="2" />
          <path strokeWidth="2" d="M3 13h18M3 17h18M3 21h18" />
        </svg>
        <span>Header {showCustomHeader ? 'ON' : 'OFF'}</span>
      </button>

      {/* Dimensions Toggle */}
      <button
        onClick={toggleDimensions}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded
          transition-colors duration-150 w-full
          ${showDimensions 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300 dark:border-green-700' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
          }
          hover:bg-green-200 dark:hover:bg-green-800
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
        `}
        aria-pressed={showDimensions}
        title={showDimensions ? 'Hide viewport dimensions' : 'Show viewport dimensions'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeWidth="2" strokeLinecap="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth="2" />
        </svg>
        <span>Dims {showDimensions ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
}
