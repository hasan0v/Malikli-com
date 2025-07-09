'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useI18n } from '../../../hooks/useI18n';
import { API_BASE_URL } from '@/lib/api/config';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  useEffect(() => {
    const urlToken = searchParams?.get('token');
    if (!urlToken) {
      router.push('/auth/forgot-password');
    } else {
      setToken(urlToken);
    }
  }, [searchParams, router]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};    if (!formData.password) {
      newErrors.password = t('auth.resetPassword.validation.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.resetPassword.validation.passwordLength');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.resetPassword.validation.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.resetPassword.validation.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          token,
          password: formData.password,
          password2: formData.confirmPassword,
        }),
      });

      if (response.ok) {
        setSuccess(true);      } else {
        const errorData = await response.json();
        setErrors(errorData);
      }
    } catch (error) {
      setErrors({ general: t('common.error') });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };
  if (!token) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>{t('auth.resetPassword.invalidLinkTitle')}</h1>
            <p className={styles.authSubtitle}>
              {t('auth.resetPassword.invalidLinkMessage')}
            </p>
          </div>
          <div className={styles.authFooter}>
            <Link href="/auth/forgot-password" className={styles.linkButton}>
              {t('auth.resetPassword.requestNewLink')}
            </Link>
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
            <h1 className={styles.authTitle}>{t('auth.resetPassword.successTitle')}</h1>
            <p className={styles.authSubtitle}>
              {t('auth.resetPassword.successMessage')}
            </p>
          </div>

          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p>{t('auth.resetPassword.successMessage')}</p>
          </div>

          <div className={styles.authFooter}>
            <Link href="/auth/login" className={styles.linkButton}>
              {t('auth.resetPassword.backToLogin')}
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
          <h1 className={styles.authTitle}>{t('auth.resetPassword.title')}</h1>
          <p className={styles.authSubtitle}>
            {t('auth.resetPassword.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {errors.general && (
            <div className={styles.errorMessage}>{errors.general}</div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              {t('auth.resetPassword.password')}
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.password ? styles.inputError : ''}`}
                placeholder={t('auth.resetPassword.passwordPlaceholder')}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <span className={styles.errorText}>{errors.password}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              {t('auth.resetPassword.confirmPassword')}
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={styles.errorText}>{errors.confirmPassword}</span>
            )}
          </div>          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.authButton} ${styles.primaryButton}`}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                {t('auth.resetPassword.resetButtonLoading')}
              </>
            ) : (
              t('auth.resetPassword.resetButton')
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p>
            {t('auth.forgotPassword.rememberedPassword')}{' '}
            <Link href="/auth/login" className={styles.authLink}>
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
