import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DS_URLS } from '@digistratum/ds-core';
import type { User, AuthContext } from '../../types';
import type { UserSessionProps, UserSessionMenuProps, UserSessionVariant } from './types';

/**
 * UserSession - Displays user info (avatar, name, tenant)
 * 
 * A reusable sub-component for showing authenticated user information.
 * Can be used standalone or integrated into headers/navs.
 * 
 * @example
 * ```tsx
 * // Compact (avatar + name)
 * <UserSession user={user} currentTenant={tenantId} variant="compact" />
 * 
 * // Full (avatar + name + tenant + role)
 * <UserSession user={user} currentTenant={tenantId} variant="full" showTenant showRole />
 * 
 * // Avatar only (minimal, for tight spaces)
 * <UserSession user={user} variant="avatar-only" />
 * ```
 */
export function UserSession({
  user,
  currentTenant,
  variant = 'compact',
  showTenant = false,
  showRole = false,
  onClick,
  showDropdownIndicator = false,
  className = '',
  interactive = true,
}: UserSessionProps) {
  const { t } = useTranslation();

  if (!user) return null;

  // Derive display values
  const userName = user.name || user.email || '';
  const userInitial = (userName || '?').charAt(0).toUpperCase();
  const currentTenantInfo = user.tenants?.find(t => t.id === currentTenant);
  const tenantName = currentTenantInfo?.name || t('nav.personal', 'Personal');
  const tenantRole = currentTenantInfo?.role;

  // Render avatar
  const Avatar = () => (
    user.avatarUrl ? (
      <img 
        src={user.avatarUrl} 
        alt={userName} 
        className="w-8 h-8 rounded-full flex-shrink-0"
      />
    ) : (
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
        {userInitial}
      </div>
    )
  );

  // Render dropdown indicator
  const DropdownIndicator = () => (
    <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const baseClasses = interactive 
    ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
    : '';

  // Avatar-only variant
  if (variant === 'avatar-only') {
    const Wrapper = onClick ? 'button' : 'div';
    return (
      <Wrapper
        className={`flex items-center ${baseClasses} rounded-full p-1 ${className}`}
        onClick={onClick}
        type={onClick ? 'button' : undefined}
        aria-label={t('nav.userMenu', 'User menu')}
      >
        <Avatar />
        {showDropdownIndicator && <DropdownIndicator />}
      </Wrapper>
    );
  }

  // Compact variant: avatar + name
  if (variant === 'compact') {
    const Wrapper = onClick ? 'button' : 'div';
    return (
      <Wrapper
        className={`flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 ${baseClasses} rounded-md ${className}`}
        onClick={onClick}
        type={onClick ? 'button' : undefined}
      >
        <Avatar />
        <span className="ml-2 truncate max-w-[120px]">{userName}</span>
        {showDropdownIndicator && <DropdownIndicator />}
      </Wrapper>
    );
  }

  // Full variant: avatar + name + tenant + role
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      className={`flex items-center px-3 py-2 text-sm ${baseClasses} rounded-md ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <Avatar />
      <div className="ml-3 text-left min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {userName}
        </div>
        {showTenant && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
            <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{tenantName}</span>
            {showRole && tenantRole && (
              <span className="ml-1">({tenantRole})</span>
            )}
          </div>
        )}
      </div>
      {showDropdownIndicator && <DropdownIndicator />}
    </Wrapper>
  );
}

/**
 * UserSessionMenu - Dropdown menu for user session actions
 * 
 * Standard menu with account link, settings, and logout.
 * Can be extended with additional items.
 * 
 * @example
 * ```tsx
 * <UserSessionMenu
 *   user={user}
 *   auth={auth}
 *   isOpen={showMenu}
 *   onClose={() => setShowMenu(false)}
 * />
 * ```
 */
export function UserSessionMenu({
  user,
  auth,
  isOpen,
  onClose,
  additionalItems,
  className = '',
}: UserSessionMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userName = user.name || user.email || '';

  return (
    <div 
      ref={menuRef}
      className={`absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 ${className}`}
      role="menu"
      aria-orientation="vertical"
    >
      {/* User info header */}
      <a 
        href={DS_URLS.ACCOUNT} 
        className="block px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        role="menuitem"
      >
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {userName || user.email}
        </p>
        {user.name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
        )}
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
          {t('nav.manageAccount', 'Manage account')} →
        </p>
      </a>

      {/* Menu items */}
      <div className="py-1">
        <a 
          href="/settings" 
          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          role="menuitem"
        >
          <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('common.settings', 'Settings')}
        </a>

        {/* Additional custom items */}
        {additionalItems}

        {/* Logout */}
        <button
          onClick={() => { auth.logout(); onClose(); }}
          className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          role="menuitem"
        >
          <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t('common.logout', 'Logout')}
        </button>
      </div>
    </div>
  );
}
