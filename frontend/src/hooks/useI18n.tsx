"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import ar from '../locales/ar.json';
import tr from '../locales/tr.json';
import zh from '../locales/zh.json'; // Import Chinese translations
import { getLanguages, Language } from '../services/languageService';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLocales: string[];
  languages: Language[];
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations = {
  en,
  ru,
  ar,
  tr,
  zh
};

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setCurrentLocale] = useState<string>('en');
  // Initialize with default language data to avoid hydration errors
  const [languages, setLanguages] = useState<Language[]>([
    { code: 'en', name: 'English', native_name: 'English', is_rtl: false, flag_code: 'us', display_order: 1 },
    { code: 'ru', name: 'Russian', native_name: 'Русский', is_rtl: false, flag_code: 'ru', display_order: 2 },
    { code: 'ar', name: 'Arabic', native_name: 'العربية', is_rtl: true, flag_code: 'sa', display_order: 3 },
    { code: 'tr', name: 'Turkish', native_name: 'Türkçe', is_rtl: false, flag_code: 'tr', display_order: 4 },
    { code: 'zh', name: 'Chinese', native_name: '中文', is_rtl: false, flag_code: 'cn', display_order: 5 }
  ]);
  const [isRTL, setIsRTL] = useState(false);
  const [availableLocales, setAvailableLocales] = useState<string[]>(['en', 'ru', 'ar', 'tr']);

  // Fetch available languages from the API
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languagesData = await getLanguages();
        setLanguages(languagesData);
        
        // Update available locales based on API response
        const codes = languagesData.map(lang => lang.code);
        if (codes.length > 0) {
          setAvailableLocales(codes);
        }
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      }
    };
    
    fetchLanguages();
  }, []);

  useEffect(() => {
    // Load locale from localStorage or browser preference
    const savedLocale = localStorage.getItem('locale');
    const browserLocale = navigator.language.split('-')[0];
    
    // Check if browser locale is in available locales
    const isBrowserLocaleAvailable = availableLocales.includes(browserLocale);
    
    const initialLocale = savedLocale || 
                         (isBrowserLocaleAvailable ? browserLocale : 'en');
    
    setCurrentLocale(initialLocale);
    
    // Set RTL state based on selected language
    const selectedLang = languages.find(lang => lang.code === initialLocale);
    if (selectedLang) {
      setIsRTL(selectedLang.is_rtl);
      
      // Set dir attribute on html element
      if (typeof document !== 'undefined') {
        document.documentElement.dir = selectedLang.is_rtl ? 'rtl' : 'ltr';
      }
    }
  }, [languages, availableLocales]);

  const setLocale = (newLocale: string) => {
    setCurrentLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    
    // Update RTL state
    const selectedLang = languages.find(lang => lang.code === newLocale);
    if (selectedLang) {
      setIsRTL(selectedLang.is_rtl);
    }
    
    // Update HTML lang attribute and direction
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
      document.documentElement.dir = selectedLang?.is_rtl ? 'rtl' : 'ltr';
      
      // Import product service dynamically to avoid circular dependency
      import('../services/productService').then(module => {
        if (module.clearProductCache) {
          module.clearProductCache();
        }
      });
      
      // Force reload current page to refresh data with new language
      window.location.reload();
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    // Replace parameters in the translation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    availableLocales,
    languages,
    isRTL
  };
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
