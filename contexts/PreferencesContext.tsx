
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getTranslation, type Language as I18nLanguage, type Translations } from '../lib/i18n';

export type Language = 'en' | 'sw';
export type Currency = 'TZS' | 'USD' | 'KES' | 'UGX';

interface PreferencesContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: keyof Translations) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexa_lang') as Language;
      return saved || 'en';
    }
    return 'en';
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexa_curr') as Currency;
      return saved || 'TZS';
    }
    return 'TZS';
  });

  // Update HTML lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const updateLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('nexa_lang', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  const updateCurrency = (curr: Currency) => {
    setCurrency(curr);
    localStorage.setItem('nexa_curr', curr);
  };

  const t = (key: keyof Translations): string => {
    return getTranslation(language as I18nLanguage, key);
  };

  return (
    <PreferencesContext.Provider value={{ language, setLanguage: updateLanguage, currency, setCurrency: updateCurrency, t }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};
