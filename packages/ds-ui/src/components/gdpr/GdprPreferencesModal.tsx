/**
 * GDPR Preferences Modal Component
 * Allows users to customize their cookie preferences
 */

import React, { useState, useEffect } from 'react';
import type { GdprPreferencesModalProps, GdprPreferences } from './types';

/**
 * Modal for customizing GDPR cookie preferences
 */
export function GdprPreferencesModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  title = 'Cookie Preferences',
  className = '',
  zIndex = 10001,
}: GdprPreferencesModalProps): React.ReactElement | null {
  const [localPrefs, setLocalPrefs] = useState<GdprPreferences>(preferences);

  // Sync with external preferences when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences);
    }
  }, [isOpen, preferences]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof GdprPreferences) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    onSave(localPrefs);
  };

  const handleAcceptAll = () => {
    onSave({ analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    onSave({ analytics: false, marketing: false });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: zIndex - 1,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gdpr-modal-title"
        className={`gdpr-preferences-modal ${className}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--gdpr-modal-bg, #ffffff)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          color: 'var(--gdpr-text-color, #333333)',
        }}
      >
        <h2
          id="gdpr-modal-title"
          style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
          {title}
        </h2>

        <p style={{ margin: '0 0 24px 0', fontSize: '14px', lineHeight: 1.5, opacity: 0.8 }}>
          We use cookies to enhance your experience. You can choose which categories of cookies you allow.
          Essential cookies are always enabled as they are necessary for the website to function.
        </p>

        {/* Cookie Categories */}
        <div style={{ marginBottom: '24px' }}>
          {/* Essential (always on) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--gdpr-category-bg, #f5f5f5)',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Essential</div>
              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                Required for the website to function. Cannot be disabled.
              </div>
            </div>
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--gdpr-badge-bg, #e0e0e0)',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Always On
            </div>
          </div>

          {/* Analytics */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--gdpr-category-bg, #f5f5f5)',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Analytics</div>
              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                Help us understand how visitors interact with our website.
              </div>
            </div>
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '48px',
                height: '28px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={localPrefs.analytics}
                onChange={() => handleToggle('analytics')}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
                aria-label="Enable analytics cookies"
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: localPrefs.analytics
                    ? 'var(--gdpr-toggle-on, #4CAF50)'
                    : 'var(--gdpr-toggle-off, #ccc)',
                  borderRadius: '28px',
                  transition: 'background-color 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: localPrefs.analytics ? '24px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                  }}
                />
              </span>
            </label>
          </div>

          {/* Marketing */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--gdpr-category-bg, #f5f5f5)',
              borderRadius: '8px',
            }}
          >
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Marketing</div>
              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                Used to deliver personalized advertisements and track ad performance.
              </div>
            </div>
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '48px',
                height: '28px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={localPrefs.marketing}
                onChange={() => handleToggle('marketing')}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
                aria-label="Enable marketing cookies"
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: localPrefs.marketing
                    ? 'var(--gdpr-toggle-on, #4CAF50)'
                    : 'var(--gdpr-toggle-off, #ccc)',
                  borderRadius: '28px',
                  transition: 'background-color 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: localPrefs.marketing ? '24px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                  }}
                />
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleRejectAll}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--gdpr-border-color, #ddd)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: 'inherit',
            }}
          >
            Reject All
          </button>
          <button
            onClick={handleAcceptAll}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--gdpr-border-color, #ddd)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: 'inherit',
            }}
          >
            Accept All
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'var(--gdpr-primary-color, #2563eb)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </>
  );
}

export default GdprPreferencesModal;
