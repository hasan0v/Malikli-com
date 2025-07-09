'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../hooks/useI18n';
import Portal from '../Portal';
import styles from './CheckoutOptionsModal.module.css';

interface CheckoutOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl: string;
  title?: string;
  subtitle?: string;
}

const CheckoutOptionsModal: React.FC<CheckoutOptionsModalProps> = ({
  isOpen,
  onClose,
  redirectUrl,
  title,
  subtitle
}) => {
  const { t } = useI18n();
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    // Store the redirect URL for after login
    localStorage.setItem('redirectAfterLogin', redirectUrl);
    onClose();
    router.push('/auth/login');
  };

  const handleGuestCheckout = () => {
    onClose();
    router.push(redirectUrl);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={handleBackdropClick}>
        <div className={styles.modalContent}>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
          
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {title || t('checkout.options.title')}
            </h2>
            <p className={styles.modalSubtitle}>
              {subtitle || t('checkout.options.subtitle')}
            </p>
          </div>

          <div className={styles.optionsContainer}>
            {/* Login Option */}
            <div className={styles.option}>
              <div className={styles.optionHeader}>
                <div className={styles.optionIcon}>👤</div>
                <h3 className={styles.optionTitle}>
                  {t('checkout.options.login.title')}
                </h3>
              </div>
              <p className={styles.optionDescription}>
                {t('checkout.options.login.description')}
              </p>
              <ul className={styles.optionBenefits}>
                <li>✓ {t('checkout.options.login.benefit1')}</li>
                <li>✓ {t('checkout.options.login.benefit2')}</li>
                <li>✓ {t('checkout.options.login.benefit3')}</li>
                <li>✓ {t('checkout.options.login.benefit4')}</li>
              </ul>
              <button 
                className={styles.loginButton}
                onClick={handleLogin}
              >
                {t('checkout.options.login.button')}
              </button>
            </div>

            {/* Guest Checkout Option */}
            <div className={styles.option}>
              <div className={styles.optionHeader}>
                <div className={styles.optionIcon}>🛒</div>
                <h3 className={styles.optionTitle}>
                  {t('checkout.options.guest.title')}
                </h3>
              </div>
              <p className={styles.optionDescription}>
                {t('checkout.options.guest.description')}
              </p>
              <ul className={styles.optionBenefits}>
                <li>✓ {t('checkout.options.guest.benefit1')}</li>
                <li>✓ {t('checkout.options.guest.benefit2')}</li>
                <li>✓ {t('checkout.options.guest.benefit3')}</li>
              </ul>
              <button 
                className={styles.guestButton}
                onClick={handleGuestCheckout}
              >
                {t('checkout.options.guest.button')}
              </button>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <p className={styles.footerNote}>
              {t('checkout.options.footerNote')}
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CheckoutOptionsModal;
