/**
 * GDPR Consent Management Link
 * A small link/button to open cookie preferences anytime
 */

import React from 'react';
import { useGdprConsent } from './useGdprConsent';
import { GdprPreferencesModal } from './GdprPreferencesModal';
import type { GdprPreferences } from './types';

export interface GdprManageLinkProps {
  /** Link text */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Render as button instead of link */
  asButton?: boolean;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * A link/button to open cookie preferences modal
 * 
 * Use this in your footer or settings page to let users manage their preferences anytime.
 * 
 * @example
 * ```tsx
 * // In footer
 * <footer>
 *   <GdprManageLink>Cookie Settings</GdprManageLink>
 * </footer>
 * 
 * // As a button
 * <GdprManageLink asButton>Manage Cookies</GdprManageLink>
 * ```
 */
export function GdprManageLink({
  children = 'Cookie Settings',
  className = '',
  asButton = false,
  style,
}: GdprManageLinkProps): React.ReactElement {
  const {
    consent,
    preferencesOpen,
    openPreferences,
    closePreferences,
    setPreferences,
  } = useGdprConsent();

  const currentPreferences: GdprPreferences = consent?.preferences ?? {
    analytics: false,
    marketing: false,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openPreferences();
  };

  const defaultLinkStyle: React.CSSProperties = {
    color: 'var(--gdpr-link-color, #2563eb)',
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    ...style,
  };

  const defaultButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: '1px solid var(--gdpr-border-color, #d1d5db)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'inherit',
    ...style,
  };

  return (
    <>
      {asButton ? (
        <button
          type="button"
          onClick={handleClick}
          className={`gdpr-manage-link ${className}`}
          style={defaultButtonStyle}
        >
          {children}
        </button>
      ) : (
        <a
          href="#"
          onClick={handleClick}
          className={`gdpr-manage-link ${className}`}
          style={defaultLinkStyle}
          role="button"
        >
          {children}
        </a>
      )}

      <GdprPreferencesModal
        isOpen={preferencesOpen}
        onClose={closePreferences}
        preferences={currentPreferences}
        onSave={setPreferences}
      />
    </>
  );
}

export default GdprManageLink;
