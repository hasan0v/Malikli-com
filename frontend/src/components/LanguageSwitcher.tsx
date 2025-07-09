"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import styles from './LanguageSwitcher.module.css';

const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, availableLocales, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const changeLanguage = (newLocale: string) => {
    if (newLocale !== locale) {
      console.log(`Changing language from ${locale} to ${newLocale}`);
      setLocale(newLocale);
      setIsOpen(false);
    }
  };
  // Helper function to get language object for current locale
  const getCurrentLanguage = () => {
    // Default fallback values to ensure consistent rendering between server and client
    const fallbacks: Record<string, {native_name: string, flag_code: string}> = {
      'en': { native_name: 'English', flag_code: 'us' },
      'ru': { native_name: 'Русский', flag_code: 'ru' },
      'ar': { native_name: 'العربية', flag_code: 'sa' },
      'tr': { native_name: 'Türkçe', flag_code: 'tr' },
      'zh': { native_name: '中文', flag_code: 'cn' },
    };

    // If languages are loaded, use the found language
    if (languages && languages.length > 0) {
      const foundLang = languages.find(lang => lang.code === locale);
      if (foundLang) {
        return foundLang;
      }
    }
    
    // Otherwise use fallback for current locale or default to English
    return fallbacks[locale] ? 
      { code: locale, native_name: fallbacks[locale].native_name, flag_code: fallbacks[locale].flag_code } : 
      { code: 'en', native_name: 'English', flag_code: 'us' };
  };
  // Helper function to get flag emoji
  const getFlagEmoji = (flag_code: string | null) => {
    // Default to US flag if no flag code is provided
    const code = flag_code || 'us';
    
    // Only proceed if we have a 2-letter code
    if (code.length !== 2) {
      return '🏳️'; // Neutral flag as fallback
    }
    
    try {
      // Convert country code to emoji flag
      const codePoints = code
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      
      return String.fromCodePoint(...codePoints);
    } catch (error) {
      console.error('Error generating flag emoji:', error);
      return '🏳️'; // Neutral flag as fallback
    }
  };
  // Close the dropdown when clicking outside
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
  return (
    <div className={styles.languageSwitcher} ref={dropdownRef}>
      <button 
        className={styles.currentLanguage} 
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className={styles.flag}>{getFlagEmoji(getCurrentLanguage().flag_code)}</span>
        <span className={styles.name}>{getCurrentLanguage().native_name}</span>
        <svg 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="12" 
          height="12" 
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
          <ul>
            {languages && languages.length > 0 ? (
              languages.map((lang) => (
                <li key={lang.code}>
                  <button 
                    className={`${styles.languageOption} ${locale === lang.code ? styles.active : ''}`}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span className={styles.flag}>{getFlagEmoji(lang.flag_code)}</span>
                    <span className={styles.name}>{lang.native_name}</span>
                  </button>
                </li>
              ))
            ) : (
              // Fallback for when languages array is empty
              ['en', 'ru', 'ar', 'tr'].map((code) => {
                const fallbacks: Record<string, {name: string, flag: string}> = {
                  'en': { name: 'English', flag: 'us' },
                  'ru': { name: 'Русский', flag: 'ru' },
                  'ar': { name: 'العربية', flag: 'sa' },
                  'tr': { name: 'Türkçe', flag: 'tr' },
                  'zh': { name: '中文', flag: 'cn' }
                };
                return (
                  <li key={code}>
                    <button 
                      className={`${styles.languageOption} ${locale === code ? styles.active : ''}`}
                      onClick={() => changeLanguage(code)}
                    >
                      <span className={styles.flag}>{getFlagEmoji(fallbacks[code].flag)}</span>
                      <span className={styles.name}>{fallbacks[code].name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>  );
};

export default LanguageSwitcher;
