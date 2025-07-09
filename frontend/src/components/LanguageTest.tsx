"use client";

import React, { useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import styles from './LanguageTest.module.css';

const LanguageTest: React.FC = () => {
  const { t, locale, languages, isRTL } = useI18n();
  
  useEffect(() => {
    console.log('Language Test Component: Current language settings', {
      locale,
      isRTL,
      availableLanguages: languages
    });
  }, [locale, languages, isRTL]);
  
  return (
    <div className={`${styles.languageTest} ${isRTL ? styles.rtl : ''}`}>
      <h2>{t('common.languageTest')}</h2>
      
      <div className={styles.currentSettings}>
        <h3>{t('common.currentSettings')}</h3>
        <ul>
          <li>
            <strong>{t('common.currentLanguage')}:</strong> {locale} ({isRTL ? t('common.rtl') : t('common.ltr')})
          </li>
          <li>
            <strong>{t('common.availableLanguages')}:</strong>
            <ul>
              {languages.map(lang => (
                <li key={lang.code}>
                  {lang.native_name} ({lang.code}) 
                  {lang.is_rtl ? ' - RTL' : ' - LTR'}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
      
      <div className={styles.translationTest}>
        <h3>{t('common.translationTest')}</h3>
        <p>{t('common.welcome')}</p>
        <p>{t('common.hello', { name: 'User' })}</p>
        <p>{t('product.description', { name: 'Test Product' })}</p>
      </div>
      
      <div className={styles.rtlTest}>
        <h3>{t('common.rtlTest')}</h3>
        <p className={styles.rtlBox}>{t('common.rtlTestText')}</p>
      </div>
    </div>
  );
};

export default LanguageTest;
