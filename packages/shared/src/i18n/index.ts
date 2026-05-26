import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ar from './locales/ar.json';
import bn from './locales/bn.json';
import hi from './locales/hi.json';
import ur from './locales/ur.json';

export type SupportedLanguage = 'en' | 'ar' | 'bn' | 'hi' | 'ur';
export type TextDirection = 'ltr' | 'rtl';

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'ur'];

export const LANGUAGE_OPTIONS = [
  { code: 'en' as SupportedLanguage, label: 'English', nativeLabel: 'English', dir: 'ltr' as TextDirection },
  { code: 'ar' as SupportedLanguage, label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' as TextDirection },
  { code: 'bn' as SupportedLanguage, label: 'Bengali', nativeLabel: 'বাংলা', dir: 'ltr' as TextDirection },
  { code: 'hi' as SupportedLanguage, label: 'Hindi', nativeLabel: 'हिन्दी', dir: 'ltr' as TextDirection },
  { code: 'ur' as SupportedLanguage, label: 'Urdu', nativeLabel: 'اردو', dir: 'rtl' as TextDirection },
];

export function getDirection(lang: SupportedLanguage): TextDirection {
  return RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
}

export function isRTL(lang: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(lang);
}

const LANG_KEY = 'fuel_station_lang';
const VALID_LANGS: SupportedLanguage[] = ['en', 'ar', 'bn', 'hi', 'ur'];

export interface I18nStorage {
  get: () => string | null;
  set: (lang: string) => void;
}

/** Default web storage — safe-guarded so it doesn't throw in React Native */
const webStorage: I18nStorage = {
  get: () => (typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null),
  set: (lang) => { if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang); },
};

export const initI18n = (defaultLanguage: SupportedLanguage = 'en', storage?: I18nStorage) => {
  if (i18n.isInitialized) return i18n;

  const store = storage ?? webStorage;
  const saved = store.get() as SupportedLanguage | null;
  const lng: SupportedLanguage = saved && VALID_LANGS.includes(saved) ? saved : defaultLanguage;

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      bn: { translation: bn },
      hi: { translation: hi },
      ur: { translation: ur },
    },
    lng,
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    initImmediate: false,
    interpolation: {
      escapeValue: false,
    },
  });

  i18n.on('languageChanged', (lang) => store.set(lang));

  return i18n;
};

export default i18n;
