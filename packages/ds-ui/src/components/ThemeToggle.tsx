import { useTranslation } from 'react-i18next';
import type { ThemeContext } from '../types';

export interface ThemeToggleProps {
  /** Theme context */
  theme: ThemeContext;
  /** Optional class name for styling */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
}

/**
 * Theme toggle button for light/dark mode
 * [FR-THEME-001]
 */
export function ThemeToggle({ theme, className = '', showLabel = false }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme } = theme;

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${showLabel ? 'flex items-center' : ''} ${className}`}
      aria-label={t('theme.' + (resolvedTheme === 'light' ? 'dark' : 'light'))}
    >
      {resolvedTheme === 'light' ? (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          {showLabel && <span className="ml-2">{t('theme.dark', 'Dark mode')}</span>}
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {showLabel && <span className="ml-2">{t('theme.light', 'Light mode')}</span>}
        </>
      )}
    </button>
  );
}
