import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from '@/locales/en.json';
import translationTR from '@/locales/tr.json';

const resources = {
  en: {
    translation: translationEN
  },
  tr: {
    translation: translationTR
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      excludeCacheFor: ['cimode']
    },
    interpolation: {
      escapeValue: false // React already escapes
    },
    react: {
      useSuspense: false // Avoid suspense issues on load
    },
    load: 'languageOnly', // Load only 'en', not 'en-US'
    returnEmptyString: false, // Return key if translation is empty
    returnNull: false
  });

export default i18n;
