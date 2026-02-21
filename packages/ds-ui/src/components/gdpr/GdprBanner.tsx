/**
 * GDPR Consent Banner Component
 * Shows a cookie consent banner and manages user preferences
 */

import React from 'react';
import type { GdprBannerProps, GdprPreferences } from './types';
import { useGdprConsent } from './useGdprConsent';
import { GdprPreferencesModal } from './GdprPreferencesModal';

/**
 * GDPR Consent Banner
 * 
 * Displays a cookie consent banner at the bottom (or top) of the page.
 * Handles Accept All, Reject All, and Customize flows.
 * 
 * @example
 * ```tsx
 * // Basic usage - just mount it anywhere in your app
 * function App() {
 *   return (
 *     <>
 *       <YourAppContent />
 *       <GdprBanner />
 *     </>
 *   );
 * }
 * 
 * // With custom text
 * <GdprBanner
 *   title="We value your privacy"
 *   description="We use cookies to improve your experience."
 *   privacyPolicyUrl="/privacy"
 * />
 * ```
 */
export function GdprBanner({
  title = 'Cookie Consent',
  description = 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
  acceptAllText = 'Accept All',
  rejectAllText = 'Reject All',
  customizeText = 'Customize',
  savePreferencesText = 'Save Preferences',
  privacyPolicyUrl,
  privacyPolicyText = 'Privacy Policy',
  position = 'bottom',
  className = '',
  zIndex = 10000,
}: GdprBannerProps): React.ReactElement | null {
  const {
    consent,
    showBanner,
    isLoading,
    preferencesOpen,
    acceptAll,
    rejectAll,
    setPreferences,
    openPreferences,
    closePreferences,
  } = useGdprConsent();

  // Don't render anything while loading
  if (isLoading) return null;

  // Don't show banner if consent already given (unless preferences modal is open)
  if (!showBanner && !preferencesOpen) return null;

  // Default preferences for the modal
  const currentPreferences: GdprPreferences = consent?.preferences ?? {
    analytics: false,
    marketing: false,
  };

  return (
    <>
      {/* Banner */}
      {showBanner && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-describedby="gdpr-banner-description"
          className={`gdpr-banner ${className}`}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            [position]: 0,
            backgroundColor: 'var(--gdpr-banner-bg, #ffffff)',
            borderTop: position === 'bottom' ? '1px solid var(--gdpr-border-color, #e5e7eb)' : 'none',
            borderBottom: position === 'top' ? '1px solid var(--gdpr-border-color, #e5e7eb)' : 'none',
            boxShadow: position === 'bottom'
              ? '0 -4px 20px rgba(0, 0, 0, 0.1)'
              : '0 4px 20px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            zIndex,
            color: 'var(--gdpr-text-color, #333333)',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Content */}
            <div>
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                {title}
              </h3>
              <p
                id="gdpr-banner-description"
                style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.5,
                  opacity: 0.8,
                }}
              >
                {description}
                {privacyPolicyUrl && (
                  <>
                    {' '}
                    <a
                      href={privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--gdpr-link-color, #2563eb)',
                        textDecoration: 'underline',
                      }}
                    >
                      {privacyPolicyText}
                    </a>
                  </>
                )}
              </p>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <button
                onClick={rejectAll}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--gdpr-border-color, #d1d5db)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'inherit',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gdpr-button-hover, #f3f4f6)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {rejectAllText}
              </button>

              <button
                onClick={openPreferences}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--gdpr-border-color, #d1d5db)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'inherit',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gdpr-button-hover, #f3f4f6)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {customizeText}
              </button>

              <button
                onClick={acceptAll}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: 'var(--gdpr-primary-color, #2563eb)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gdpr-primary-hover, #1d4ed8)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gdpr-primary-color, #2563eb)';
                }}
              >
                {acceptAllText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <GdprPreferencesModal
        isOpen={preferencesOpen}
        onClose={closePreferences}
        preferences={currentPreferences}
        onSave={setPreferences}
        title={savePreferencesText === 'Save Preferences' ? 'Cookie Preferences' : savePreferencesText}
        zIndex={zIndex + 1}
      />
    </>
  );
}

export default GdprBanner;
