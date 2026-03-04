import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsent } from './GdprBanner';
import type { ConsentLevel, CookiePreferencesModalProps } from './types';

/**
 * Cookie Preferences Modal
 * 
 * Allows users to view and update their cookie consent preferences.
 */
export function CookiePreferencesModal({ isOpen, onClose }: CookiePreferencesModalProps) {
  const { t } = useTranslation();
  const { consentLevel, setConsent } = useConsent();
  const [selectedLevel, setSelectedLevel] = useState<ConsentLevel>(consentLevel);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSelectedLevel(consentLevel);
  }, [consentLevel]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSave = useCallback(() => {
    if (selectedLevel === 'all' || selectedLevel === 'essential') {
      setConsent(selectedLevel);
    }
    onClose();
  }, [selectedLevel, setConsent, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-preferences-title"
      onClick={handleBackdropClick}
    >
      <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2
              id="cookie-preferences-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <span aria-hidden="true">🍪</span>
              {t('cookies.preferencesTitle', 'Cookie Preferences')}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
              aria-label={t('common.close', 'Close')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('cookies.preferencesDescription', 'Choose which cookies you want to accept.')}
            </p>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {t('cookies.essential', 'Essential Cookies')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('cookies.essentialDescription', 'Required for authentication and basic functionality.')}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                  {t('cookies.alwaysOn', 'Always On')}
                </span>
              </div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {t('cookies.optional', 'Analytics & Personalization')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('cookies.optionalDescription', 'Help us improve the site and provide personalized content.')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={selectedLevel === 'all'}
                  onClick={() => setSelectedLevel(selectedLevel === 'all' ? 'essential' : 'all')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    selectedLevel === 'all' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      selectedLevel === 'all' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {consentLevel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('cookies.currentSetting', 'Current setting: {{level}}', {
                  level: consentLevel === 'all' 
                    ? t('cookies.allCookies', 'All cookies accepted')
                    : t('cookies.essentialOnly', 'Essential only')
                })}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {t('cookies.savePreferences', 'Save Preferences')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage cookie preferences modal state
 */
export function useCookiePreferencesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  return { isOpen, open, close, toggle };
}
