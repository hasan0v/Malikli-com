'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserProfile, logout } from '@/store/authSlice';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingCircle from '@/components/LoadingCircle';
import { useI18n } from '../../hooks/useI18n';
import { API_BASE_URL } from '@/lib/api/config';
import styles from './profile.module.css';

function ProfileContent() {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAppSelector((state) => state.auth);
  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
    } else {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone_number || '',
      });
    }
  }, [dispatch, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await dispatch(fetchUserProfile());
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };
  if (isLoading) {    return (
      <div className={styles.profileContainer}>
        <div className={styles.loadingContainer}>
          <LoadingCircle size="large" color="primary" text={t('profile.loading')} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {user.first_name ? user.first_name[0].toUpperCase() : 'П'}
            </div>
            <div className={styles.userInfo}>
              <h1 className={styles.userName}>
                {user.first_name} {user.last_name}
              </h1>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>
          <div className={styles.actionButtons}>            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`${styles.button} ${styles.editButton}`}
            >
              {isEditing ? t('profile.cancel') : t('profile.edit')}
            </button>
            <button
              onClick={handleLogout}
              className={`${styles.button} ${styles.logoutButton}`}
            >
              {t('profile.logout')}
            </button>
          </div>
        </div>

        <div className={styles.profileContent}>          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('profile.personalInfo.title')}</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('profile.personalInfo.firstName')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                ) : (
                  <p className={styles.formValue}>{user.first_name || t('profile.notSpecified')}</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('profile.personalInfo.lastName')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                ) : (
                  <p className={styles.formValue}>{user.last_name || t('profile.notSpecified')}</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('profile.personalInfo.email')}</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                ) : (
                  <p className={styles.formValue}>{user.email}</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t('profile.personalInfo.phone')}</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder={t('profile.personalInfo.phonePlaceholder')}
                  />
                ) : (
                  <p className={styles.formValue}>{user.phone_number || t('profile.notSpecified')}</p>
                )}
              </div>
            </div>            {isEditing && (
              <div className={styles.saveActions}>
                <button
                  onClick={handleSave}
                  className={`${styles.button} ${styles.saveButton}`}
                >
                  {t('profile.saveChanges')}
                </button>
              </div>
            )}
          </div>          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('profile.accountSettings.title')}</h2>
            <div className={styles.settingsGrid}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingTitle}>{t('profile.accountSettings.changePassword.title')}</h3>
                  <p className={styles.settingDescription}>
                    {t('profile.accountSettings.changePassword.description')}
                  </p>
                </div>
                <button className={`${styles.button} ${styles.secondaryButton}`}>
                  {t('profile.accountSettings.changePassword.button')}
                </button>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <h3 className={styles.settingTitle}>{t('profile.accountSettings.notifications.title')}</h3>
                  <p className={styles.settingDescription}>
                    {t('profile.accountSettings.notifications.description')}
                  </p>
                </div>
                <button className={`${styles.button} ${styles.secondaryButton}`}>
                  {t('profile.accountSettings.notifications.button')}
                </button>
              </div>
            </div>
          </div>          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('profile.orders.title')}</h2>
            <div className={styles.ordersPlaceholder}>
              <p className={styles.placeholderText}>{t('profile.orders.noOrders')}</p>
              <button className={`${styles.button} ${styles.primaryButton}`}>
                {t('profile.orders.startShopping')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
