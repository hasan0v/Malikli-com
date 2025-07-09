'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useI18n } from '../../../hooks/useI18n';
import { API_BASE_URL } from '@/lib/api/config';
import styles from '../auth.module.css';

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { user, token } = useAppSelector((state) => state.auth);

  // Redirect if not authenticated
  if (!user || !token) {
    router.push('/auth/login');
    return null;
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Текущий пароль обязателен';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Новый пароль обязателен';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Пароль должен содержать минимум 8 символов';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите новый пароль';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: formData.oldPassword,
          new_password: formData.newPassword,
          new_password2: formData.confirmPassword,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        setErrors(errorData);
      }
    } catch (error) {
      setErrors({ general: 'Ошибка сети. Попробуйте позже.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>Пароль изменен</h1>
            <p className={styles.authSubtitle}>
              Ваш пароль был успешно изменен
            </p>
          </div>

          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <p>Пароль обновлен. Пожалуйста, используйте новый пароль при следующем входе.</p>
          </div>

          <div className={styles.authFooter}>
            <Link href="/profile" className={styles.linkButton}>
              Вернуться в профиль
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
          <h1 className={styles.authTitle}>Изменить пароль</h1>
          <p className={styles.authSubtitle}>
            Введите текущий пароль и новый пароль
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {errors.general && (
            <div className={styles.errorMessage}>{errors.general}</div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="oldPassword" className={styles.formLabel}>
              Текущий пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showOldPassword ? 'text' : 'password'}
                id="oldPassword"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.oldPassword ? styles.inputError : ''}`}
                placeholder="Введите текущий пароль"
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.oldPassword && (
              <span className={styles.errorText}>{errors.oldPassword}</span>
            )}
            {errors.old_password && (
              <span className={styles.errorText}>{errors.old_password}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword" className={styles.formLabel}>
              Новый пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.newPassword ? styles.inputError : ''}`}
                placeholder="Введите новый пароль"
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.newPassword && (
              <span className={styles.errorText}>{errors.newPassword}</span>
            )}
            {errors.new_password && (
              <span className={styles.errorText}>{errors.new_password}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              Подтвердите новый пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Подтвердите новый пароль"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.authButton} ${styles.primaryButton}`}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Сохранение...
              </>
            ) : (
              'Изменить пароль'
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <Link href="/profile" className={styles.authLink}>
            Отмена
          </Link>
        </div>
      </div>
    </div>
  );
}
