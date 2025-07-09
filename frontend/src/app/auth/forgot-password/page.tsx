'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { requestPasswordReset } from '@/store/authSlice';
import LoadingCircle from '../../../components/LoadingCircle';
import { useI18n } from '../../../hooks/useI18n';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await dispatch(requestPasswordReset(email)).unwrap();
      setEmailSent(true);
    } catch (error) {
      console.error('Password reset failed:', error);
    }
  };
  if (emailSent) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>{t('auth.forgotPassword.emailSentTitle')}</h1>
            <p className={styles.authSubtitle}>
              {t('auth.forgotPassword.emailSentSubtitle')}
            </p>
          </div>

          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p>
              {t('auth.forgotPassword.successMessage', { email })}
            </p>
            <p className={styles.helpText}>
              {t('auth.forgotPassword.helpText')}
            </p>
          </div>

          <div className={styles.authFooter}>
            <Link href="/auth/login" className={styles.linkButton}>
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>{t('auth.forgotPassword.title')}</h1>
          <p className={styles.authSubtitle}>
            {t('auth.forgotPassword.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.inputLabel}>
              {t('auth.forgotPassword.email')}
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                required
              />
              <div className={styles.inputIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
            </div>
          </div>          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
          >
            {isLoading ? (
              <LoadingCircle size="small" color="white" text={t('auth.forgotPassword.sendButtonLoading')} />
            ) : (
              t('auth.forgotPassword.sendButton')
            )}
          </button>
        </form>        <div className={styles.authFooter}>
          <p className={styles.footerText}>
            {t('auth.forgotPassword.rememberedPassword')}{' '}
            <Link href="/auth/login" className={styles.footerLink}>
              {t('auth.forgotPassword.loginLink')}
            </Link>
          </p>
          <p className={styles.footerText}>
            {t('auth.forgotPassword.noAccount')}{' '}
            <Link href="/auth/register" className={styles.footerLink}>
              {t('auth.forgotPassword.registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
