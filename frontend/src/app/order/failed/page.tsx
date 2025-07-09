'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useI18n } from '@/hooks/useI18n';
import { getOrderById, Order } from '@/lib/api/orders';
import styles from './orderFailed.module.css';

export default function OrderFailedPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams?.get('orderId');
  const failureReason = searchParams?.get('reason');

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Authentication required');
          setIsLoading(false);
          return;
        }

        const orderData = await getOrderById(orderId, token);
        setOrder(orderData);
      } catch (error) {
        console.error('Failed to load order:', error);
        setError(error instanceof Error ? error.message : 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadOrder();
    } else {
      setIsLoading(false);
    }
  }, [orderId, isAuthenticated]);

  const formatPrice = (price: string | number): number => {
    return typeof price === 'string' ? parseFloat(price) : price;
  };

  const formatCurrency = (amount: string | number): string => {
    const numAmount = formatPrice(amount);
    return numAmount.toFixed(2);
  };

  const handleTryAgain = () => {
    if (order) {
      // Redirect to checkout with the same order items
      router.push('/checkout');
    } else {
      router.push('/cart');
    }
  };

  const handleContactSupport = () => {
    router.push('/contact');
  };

  const handleViewOrders = () => {
    router.push('/orders');
  };

  if (isLoading) {
    return (
      <div className={styles.failedPage}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{t('orderFailed.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.failedPage}>
      <div className={styles.container}>
        <div className={styles.failureState}>
          {/* Failure Icon */}
          <div className={styles.failureIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#EF4444"/>
              <path d="m15 9-6 6m0-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Failure Message */}
          <h1 className={styles.failureTitle}>{t('orderFailed.title')}</h1>
          <p className={styles.failureMessage}>{t('orderFailed.message')}</p>

          {/* Failure Reason */}
          {failureReason && (
            <div className={styles.reasonBox}>
              <h3 className={styles.reasonTitle}>{t('orderFailed.reason.title')}</h3>
              <p className={styles.reasonText}>{decodeURIComponent(failureReason)}</p>
            </div>
          )}

          {/* Order Information */}
          {order && (
            <div className={styles.orderInfo}>
              <h2 className={styles.infoTitle}>{t('orderFailed.orderInfo.title')}</h2>
              
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('orderFailed.orderInfo.orderNumber')}:</span>
                  <span className={styles.value}>{order.order_number}</span>
                </div>
                
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('orderFailed.orderInfo.amount')}:</span>
                  <span className={styles.value}>${formatCurrency(order.total_amount)}</span>
                </div>
                
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('orderFailed.orderInfo.status')}:</span>
                  <span className={`${styles.value} ${styles.statusFailed}`}>
                    {t(`orders.status.${order.status}`)}
                  </span>
                </div>
                
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('orderFailed.orderInfo.paymentStatus')}:</span>
                  <span className={`${styles.value} ${styles.paymentFailed}`}>
                    {t(`orders.paymentStatus.${order.payment_status}`)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What to do next */}
          <div className={styles.nextSteps}>
            <h3 className={styles.nextStepsTitle}>{t('orderFailed.nextSteps.title')}</h3>
            <ul className={styles.stepsList}>
              <li>{t('orderFailed.nextSteps.checkPayment')}</li>
              <li>{t('orderFailed.nextSteps.tryAgain')}</li>
              <li>{t('orderFailed.nextSteps.differentMethod')}</li>
              <li>{t('orderFailed.nextSteps.contactSupport')}</li>
            </ul>
          </div>

          {/* Common Issues */}
          <div className={styles.commonIssues}>
            <h3 className={styles.issuesTitle}>{t('orderFailed.commonIssues.title')}</h3>
            <div className={styles.issuesList}>
              <div className={styles.issue}>
                <h4>{t('orderFailed.commonIssues.insufficientFunds.title')}</h4>
                <p>{t('orderFailed.commonIssues.insufficientFunds.description')}</p>
              </div>
              <div className={styles.issue}>
                <h4>{t('orderFailed.commonIssues.cardExpired.title')}</h4>
                <p>{t('orderFailed.commonIssues.cardExpired.description')}</p>
              </div>
              <div className={styles.issue}>
                <h4>{t('orderFailed.commonIssues.networkError.title')}</h4>
                <p>{t('orderFailed.commonIssues.networkError.description')}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={handleTryAgain} className={styles.primaryButton}>
              {t('orderFailed.actions.tryAgain')}
            </button>
            <button onClick={handleContactSupport} className={styles.secondaryButton}>
              {t('orderFailed.actions.contactSupport')}
            </button>
            <button onClick={handleViewOrders} className={styles.tertiaryButton}>
              {t('orderFailed.actions.viewOrders')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
