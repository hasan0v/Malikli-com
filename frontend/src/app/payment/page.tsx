'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import { initiatePayProPayment } from '@/lib/api/payment';
import styles from './payment.module.css';

interface OrderDetails {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
}

export default function PaymentPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  const orderId = searchParams?.get('order_id');

  // Fetch order details and initiate PayPro payment
  useEffect(() => {
    const initiatePayment = async () => {
      if (!orderId) {
        setError('Order ID is required');
        setIsInitializing(false);
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        console.log('Initiating PayPro payment for order:', orderId);

        // Initiate PayPro payment - this will return the payment URL
        const paymentResponse = await initiatePayProPayment(orderId, token || undefined);
        
        console.log('PayPro payment initiated successfully:', paymentResponse);

        // Redirect to PayPro hosted checkout page
        if (paymentResponse.payment_url) {
          console.log('Redirecting to PayPro checkout:', paymentResponse.payment_url);
          window.location.href = paymentResponse.payment_url;
        } else {
          throw new Error('No payment URL received from PayPro');
        }

      } catch (err) {
        console.error('Failed to initiate PayPro payment:', err);
        setError(err instanceof Error ? err.message : 'Failed to initiate payment');
        setIsInitializing(false);
      }
    };

    initiatePayment();
  }, [orderId]);

  // Go back to checkout if there's an error
  const handleGoBack = () => {
    router.push('/checkout');
  };

  if (isInitializing && !error) {
    return (
      <div className={styles.paymentPage}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <h2>{t('payment.redirecting.title')}</h2>
            <p>{t('payment.redirecting.message')}</p>
            <div className={styles.redirectSteps}>
              <div className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <span>{t('payment.redirecting.step1')}</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <span>{t('payment.redirecting.step2')}</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <span>{t('payment.redirecting.step3')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.paymentPage}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2>{t('payment.error.title')}</h2>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.errorActions}>
              <button 
                onClick={handleGoBack} 
                className={styles.primaryButton}
              >
                {t('payment.error.backToCheckout')}
              </button>
              <button 
                onClick={() => router.push('/orders')} 
                className={styles.secondaryButton}
              >
                {t('payment.error.viewOrders')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // This shouldn't be reached as we redirect immediately
}
