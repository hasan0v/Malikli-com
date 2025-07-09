"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { registerUser, clearError } from '../../../store/authSlice';
import { RootState, AppDispatch } from '../../../store/store';
import LoadingCircle from '../../../components/LoadingCircle';
import { useI18n } from '../../../hooks/useI18n';
import styles from '../auth.module.css';

export default function RegisterPage() {  const { t } = useI18n();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [redirectTimeoutId, setRedirectTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Only redirect if authenticated and registration hasn't just completed
    if (isAuthenticated && !registrationCompleted) {
      router.push('/'); // Redirect to home if already authenticated
    }
  }, [isAuthenticated, router, registrationCompleted]);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (redirectCountdown > 0) {
      interval = setInterval(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
    } else if (redirectCountdown === 0 && registrationCompleted && successMessage) {
      // Auto redirect when countdown reaches 0
      router.push('/auth/login');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [redirectCountdown, registrationCompleted, successMessage, router]);

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (redirectTimeoutId) {
        clearTimeout(redirectTimeoutId);
      }
    };
  }, [redirectTimeoutId]);

  useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      alert(t('auth.register.validation.acceptTerms'));
      return;
    }

    if (formData.password !== formData.password2) {
      alert(t('auth.register.validation.passwordMismatch'));
      return;
    }
      try {
      setRegistrationCompleted(true); // Mark registration as in progress
      
      // Clean up form data - remove empty phone number to avoid sending empty string
      const cleanFormData: any = { ...formData };
      if (!cleanFormData.phone_number || cleanFormData.phone_number.trim() === '') {
        delete cleanFormData.phone_number;
      }
      
      const resultAction = await dispatch(registerUser(cleanFormData));
      if (registerUser.fulfilled.match(resultAction)) {
        setSuccessMessage(t('auth.register.successMessage'));
        // Start countdown timer
        setRedirectCountdown(10); // 10 second countdown
      } else {
        setRegistrationCompleted(false); // Reset if registration failed
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setRegistrationCompleted(false); // Reset if registration failed
    }
  };

  const cancelRedirect = () => {
    setRedirectCountdown(0);
    if (redirectTimeoutId) {
      clearTimeout(redirectTimeoutId);
      setRedirectTimeoutId(null);
    }
  };

  const proceedToLogin = () => {
    router.push('/auth/login');
  };

  const togglePasswordVisibility = (field: 'password' | 'password2') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowPassword2(!showPassword2);
    }
  };
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>{t('auth.register.title')}</h1>
          <p className={styles.authSubtitle}>{t('auth.register.subtitle')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && (
            <div className={styles.errorMessage}>
              {typeof error === 'string' ? error : t('auth.register.errorDefault')}
            </div>
          )}          {successMessage && (
            <div className={styles.successMessage}>
              {successMessage}
              {redirectCountdown > 0 && (
                <div className={styles.redirectInfo}>
                  <p>{t('auth.register.redirectInfo', { seconds: redirectCountdown })}</p>
                  <div className={styles.redirectActions}>
                    <button 
                      type="button" 
                      onClick={proceedToLogin}
                      className={styles.proceedButton}
                    >
                      {t('auth.register.redirectNow')}
                    </button>
                    <button 
                      type="button" 
                      onClick={cancelRedirect}
                      className={styles.cancelButton}
                    >
                      {t('auth.register.stayHere')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}          {/* <div className={styles.formRow}> */}
            <div className={styles.inputGroup}>
              <label htmlFor="first_name" className={styles.inputLabel}>
                {t('auth.register.firstName')} *
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={t('auth.register.firstNamePlaceholder')}
                  required
                />
                <div className={styles.inputIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="last_name" className={styles.inputLabel}>
                {t('auth.register.lastName')} *
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={t('auth.register.lastNamePlaceholder')}
                  required
                />
                <div className={styles.inputIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
                  </svg>
                </div>
              </div>
            </div>
          {/* </div> */}          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.inputLabel}>
              {t('auth.register.username')} *
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={styles.input}
                placeholder={t('auth.register.usernamePlaceholder')}
                required
              />
              <div className={styles.inputIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17L10.24 11.1C9.46 11.54 9 12.38 9 13.31V15L7 13V17H11C11.24 17 11.47 16.93 11.66 16.8L18.1 10.35L19.5 11.75L21 10.25V9Z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.inputLabel}>
              {t('auth.register.email')} *
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder={t('auth.register.emailPlaceholder')}
                required
              />
              <div className={styles.inputIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="phone_number" className={styles.inputLabel}>
              {t('auth.register.phone')}
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={styles.input}
                placeholder={t('auth.register.phonePlaceholder')}
              />
              <div className={styles.inputIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </div>
            </div>
          </div>          {/* <div className={styles.formRow}> */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                {t('auth.register.password')} *
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={t('auth.register.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
                  className={styles.passwordToggle}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}                </button>
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password2" className={styles.inputLabel}>
                {t('auth.register.confirmPassword')} *
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type={showPassword2 ? "text" : "password"}
                  id="password2"
                  name="password2"
                  value={formData.password2}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password2')}
                  className={styles.passwordToggle}
                >
                  {showPassword2 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          {/* </div> */}          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className={styles.checkbox}
                required
              />
              <span className={styles.checkboxCustom}></span>
              {t('auth.register.acceptTerms')}{' '}
              <Link href="/terms" className={styles.forgotLink}>
                {t('auth.register.termsLink')}
              </Link>
              {' '}{t('auth.register.andText')}{' '}
              <Link href="/privacy" className={styles.forgotLink}>                {t('auth.register.privacyLink')}
              </Link>
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !acceptTerms}
            className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
          >
            {isLoading ? (
              <LoadingCircle size="small" color="white" text={t('auth.register.registerButtonLoading')} />
            ) : (
              t('auth.register.registerButton')
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p className={styles.footerText}>
            {t('auth.register.hasAccount')}{' '}
            <Link href="/auth/login" className={styles.footerLink}>
              {t('auth.register.loginLink')}
            </Link>
          </p>        </div>

        {/* Commented out social login buttons as requested
        <div className={styles.socialDivider}>
          <span className={styles.dividerText}>{t('auth.register.orDivider')}</span>
        </div>

        <div className={styles.socialButtons}>
          <button className={styles.socialButton}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.register.socialGoogle')}
          </button>
          <button className={styles.socialButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {t('auth.register.socialFacebook')}
          </button>
        </div>
        */}
      </div>
    </div>
  );
}
