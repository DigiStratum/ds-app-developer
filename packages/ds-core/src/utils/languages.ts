/**
 * Supported languages for the DS ecosystem
 * Based on Google Translate supported languages (subset of most common)
 */

export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
}

// Most common languages from Google Translate
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska' },
  { code: 'cs', label: 'Czech', nativeLabel: 'Čeština' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית' },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά' },
  { code: 'ro', label: 'Romanian', nativeLabel: 'Română' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar' },
  { code: 'da', label: 'Danish', nativeLabel: 'Dansk' },
  { code: 'fi', label: 'Finnish', nativeLabel: 'Suomi' },
  { code: 'no', label: 'Norwegian', nativeLabel: 'Norsk' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu' },
  { code: 'fil', label: 'Filipino', nativeLabel: 'Filipino' },
];

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

export function getLanguageLabel(code: string): string {
  const lang = getLanguageByCode(code);
  return lang ? `${lang.nativeLabel} (${lang.label})` : code;
}
