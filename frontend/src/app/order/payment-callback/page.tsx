'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import { processPaymentCallback, validateCallbackParams, PaymentCallbackResponse } from '@/lib/api/payment';
import styles from './paymentCallback.module.css';

export default function PaymentCallbackPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        // Validate and extract parameters from URL
        const validation = validateCallbackParams(searchParams!);
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid callback parameters');
        }

        const { status, token, uid } = validation;        // Call backend to process the payment callback
        const result: PaymentCallbackResponse = await processPaymentCallback({
          status: status!,
          token,
          uid: uid!,
        });

        // Redirect based on the payment status
        if (status === 'success') {
          router.replace(`/order/complete?orderId=${result.orderId}`);
        } else {
          router.replace(`/order/failed?orderId=${result.orderId}&reason=${encodeURIComponent(result.reason || 'Payment failed')}`);
        }

      } catch (error) {
        console.error('Payment callback error:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setIsProcessing(false);
      }
    };

    if (searchParams) {
      handlePaymentCallback();
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className={styles.callbackPage}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.errorTitle}>{t('paymentCallback.error.title')}</h1>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.actions}>
              <button 
                onClick={() => router.push('/orders')}
                className={styles.primaryButton}
              >
                {t('paymentCallback.error.viewOrders')}
              </button>
              <button 
                onClick={() => router.push('/')}
                className={styles.secondaryButton}
              >
                {t('paymentCallback.error.backHome')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.callbackPage}>
      <div className={styles.container}>
        <div className={styles.processingState}>
          <div className={styles.spinner}></div>
          <h1 className={styles.processingTitle}>{t('paymentCallback.processing.title')}</h1>
          <p className={styles.processingMessage}>{t('paymentCallback.processing.message')}</p>
        </div>
      </div>
    </div>
  );
}
