import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * User menu with login/logout and tenant switcher
 */
export function UserMenu() {
  const { user, isAuthenticated, login, logout, currentTenant, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <button onClick={() => login()} className="btn btn-primary">
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {/* User avatar or initials */}
        <div className="w-8 h-8 rounded-full bg-ds-primary text-white flex items-center justify-center text-sm font-medium">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="hidden sm:block text-sm">{user?.display_name || user?.name || 'User'}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.display_name || user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>

            {/* Tenant switcher (if user has multiple tenants) */}
            {user?.tenants && user.tenants.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Switch Organization</p>
                <button
                  onClick={() => { switchTenant(null); setIsOpen(false); }}
                  className={`w-full text-left px-2 py-1 text-sm rounded ${!currentTenant ? 'bg-ds-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  Personal
                </button>
                {user.tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => { switchTenant(tenant.id); setIsOpen(false); }}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${currentTenant === tenant.id ? 'bg-ds-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {tenant.name}
                  </button>
                ))}
              </div>
            )}

            {/* Menu items */}
            <div className="py-2">
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
