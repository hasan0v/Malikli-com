'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '../../../hooks/useI18n';
import { API_BASE_URL } from '@/lib/api/config';
import styles from '../auth.module.css';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email обязателен');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-verification-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка отправки письма');
      }
    } catch (error) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>Письмо отправлено</h1>
            <p className={styles.authSubtitle}>
              Проверьте вашу почту
            </p>
          </div>

          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p>
              Письмо для подтверждения email было отправлено на адрес <strong>{email}</strong>
            </p>
            <p>Проверьте папку "Спам", если письмо не пришло в течение нескольких минут.</p>
          </div>

          <div className={styles.authFooter}>
            <Link href="/auth/login" className={styles.linkButton}>
              Войти в аккаунт
            </Link>
            <Link href="/" className={styles.authLink}>
              На главную
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
          <h1 className={styles.authTitle}>Подтвердить email</h1>
          <p className={styles.authSubtitle}>
            Введите ваш email для отправки письма с подтверждением
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email адрес
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className={`${styles.formInput} ${error ? styles.inputError : ''}`}
              placeholder="Введите ваш email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.authButton} ${styles.primaryButton}`}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Отправка...
              </>
            ) : (
              'Отправить письмо'
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Уже подтвердили email?{' '}
            <Link href="/auth/login" className={styles.authLink}>
              Войти
            </Link>
          </p>
          <p>
            Нет аккаунта?{' '}
            <Link href="/auth/register" className={styles.authLink}>
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
