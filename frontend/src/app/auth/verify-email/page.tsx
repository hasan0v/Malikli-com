'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '../../../hooks/useI18n';
import { API_BASE_URL } from '@/lib/api/config';
import styles from '../auth.module.css';

export default function VerifyEmailPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const urlToken = searchParams?.get('token');
    if (!urlToken) {
      setError(t('auth.verifyEmail.errorMessage'));
    } else {
      setToken(urlToken);
      verifyEmail(urlToken);
    }
  }, [searchParams, t]);

  const verifyEmail = async (verificationToken: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (response.ok) {
        setSuccess(true);      } else {
        const errorData = await response.json();
        setError(errorData.error || t('auth.verifyEmail.errorMessage'));
      }
    } catch (error) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>{t('auth.verifyEmail.title')}</h1>
            <p className={styles.authSubtitle}>
              {t('auth.verifyEmail.subtitle')}
            </p>
          </div>

          <div className={styles.loadingContainer}>
            <span className={styles.spinner}></span>
            <p>{t('auth.verifyEmail.subtitle')}</p>
          </div>
        </div>
      </div>
    );
  }
  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>{t('auth.verifyEmail.successTitle')}</h1>
            <p className={styles.authSubtitle}>
              {t('auth.verifyEmail.successMessage')}
            </p>
          </div>

          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p>{t('auth.verifyEmail.successMessage')}</p>
          </div>

          <div className={styles.authFooter}>
            <Link href="/auth/login" className={styles.linkButton}>
              {t('auth.verifyEmail.backToLogin')}
            </Link>            <Link href="/" className={styles.authLink}>
              {t('nav.home')}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>{t('auth.verifyEmail.errorTitle')}</h1>
            <p className={styles.authSubtitle}>
              {error}
            </p>
          </div>

          <div className={styles.errorMessage}>
            <p>{t('auth.verifyEmail.errorMessage')}</p>
          </div>

          <div className={styles.authFooter}>
            <Link href="/auth/resend-verification" className={styles.linkButton}>
              {t('auth.verifyEmail.resendLink')}
            </Link>
            <Link href="/auth/login" className={styles.authLink}>
              {t('auth.verifyEmail.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
