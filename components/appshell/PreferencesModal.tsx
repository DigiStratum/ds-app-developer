/**
 * PreferencesModal - User preferences dialog
 * 
 * Displays language and appearance (theme) settings.
 * All preferences are stored in a unified ds-prefs cookie.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs, SUPPORTED_LANGUAGES } from '@digistratum/ds-core';

export interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { t, i18n } = useTranslation();
  const { lang, setLang, theme, setTheme } = usePrefs();
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  // Sync language changes to i18n
  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="ds-icon ds-icon-adjustments-horizontal ds-icon-lg" />
            {t('preferences.title', 'Preferences')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <span className="ds-icon ds-icon-x-mark ds-icon-lg" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Language */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="ds-icon ds-icon-globe-alt mr-2 text-gray-500" />
              {t('preferences.language', 'Language')}
            </label>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.nativeLabel} ({language.label})
                </option>
              ))}
            </select>
          </div>
          
          {/* Appearance */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="ds-icon ds-icon-sun mr-2 text-gray-500" />
              {t('preferences.appearance', 'Appearance')}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-colors ${
                  theme === 'light' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="ds-icon ds-icon-sun" />
                {t('preferences.light', 'Light')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-colors ${
                  theme === 'dark' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="ds-icon ds-icon-moon" />
                {t('preferences.dark', 'Dark')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
}
