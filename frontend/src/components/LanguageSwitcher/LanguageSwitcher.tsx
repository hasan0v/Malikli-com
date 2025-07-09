import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../hooks/useI18n';
import styles from './LanguageSwitcher.module.css';

const languageConfig = {
  en: {
    label: 'English',
    flag: '🇺🇸',
    code: 'EN'
  },
  ru: {
    label: 'Русский',
    flag: '🇷🇺',
    code: 'RU'
  },
  ar: {
    label: 'العربية',
    flag: '🇸🇦',
    code: 'AR'
  },
  tr: {
    label: 'Türkçe',
    flag: '🇹🇷',
    code: 'TR'
  },
  zh: {
    label: '中文',
    flag: '🇨🇳',
    code: 'ZH'
  }
};

const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, availableLocales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languageConfig[locale as keyof typeof languageConfig];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className={styles.languageSwitcher} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
      >
        <span className={styles.flag}>{currentLanguage.flag}</span>
        <span className={styles.code}>{currentLanguage.code}</span>
        <svg 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            d="M6 9l6 6 6-6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownContent}>
            {availableLocales.map((localeCode) => {
              const lang = languageConfig[localeCode as keyof typeof languageConfig];
              const isActive = localeCode === locale;
              
              return (
                <button
                  key={localeCode}
                  className={`${styles.option} ${isActive ? styles.active : ''}`}
                  onClick={() => handleLanguageChange(localeCode)}
                  disabled={isActive}
                >
                  <span className={styles.flag}>{lang.flag}</span>
                  <span className={styles.label}>{lang.label}</span>
                  {isActive && (
                    <svg 
                      className={styles.checkmark} 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none"
                    >
                      <path 
                        d="M20 6L9 17l-5.5-5.5" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
