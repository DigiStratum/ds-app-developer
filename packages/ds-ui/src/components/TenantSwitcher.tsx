import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuthContext } from '../types';

export interface TenantSwitcherProps {
  /** Auth context with user and switchTenant */
  auth: Pick<AuthContext, 'user' | 'currentTenant' | 'switchTenant'>;
  /** Optional class name for styling */
  className?: string;
}

/**
 * Standalone tenant switcher component
 * [FR-TENANT-002]
 * 
 * Can be used independently of DSNav for custom layouts
 */
export function TenantSwitcher({ auth, className = '' }: TenantSwitcherProps) {
  const { t } = useTranslation();
  const { user, currentTenant, switchTenant } = auth;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || user.tenants.length === 0) {
    return null;
  }

  const tenantName = currentTenant 
    ? `Org: ${currentTenant}` 
    : t('nav.personal', 'Personal');

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span>{tenantName}</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              onClick={() => { switchTenant(null); setShowMenu(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${!currentTenant ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
            >
              {t('nav.personal', 'Personal')}
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            {user.tenants.map((tenant) => (
              <button
                key={tenant}
                onClick={() => { switchTenant(tenant); setShowMenu(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${currentTenant === tenant ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
              >
                {tenant}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
