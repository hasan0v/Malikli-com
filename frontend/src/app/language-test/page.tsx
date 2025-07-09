"use client";

import React from 'react';
import LanguageTest from '@/components/LanguageTest';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import styles from './language-test.module.css';

export default function LanguageTestPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Language System Test</h1>
        <div className={styles.switcher}>
          <LanguageSwitcher />
        </div>
      </div>
      <LanguageTest />
    </div>
  );
}
