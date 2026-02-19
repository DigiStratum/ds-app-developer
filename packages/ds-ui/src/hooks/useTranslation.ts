import { useTranslation as useI18nTranslation, UseTranslationOptions } from 'react-i18next';

/**
 * Re-export of react-i18next useTranslation for consistent i18n across DS apps
 * [FR-I18N-001, FR-I18N-003]
 * 
 * Usage:
 * ```tsx
 * const { t } = useTranslation();
 * return <h1>{t('common.title')}</h1>;
 * ```
 */
export function useTranslation(ns?: string | string[], options?: UseTranslationOptions<string>) {
  return useI18nTranslation(ns, options);
}

export type { TFunction } from 'i18next';
